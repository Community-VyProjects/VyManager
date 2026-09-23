import net from "node:net";
import tls from "node:tls";

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function encodeAuthPlain(user: string, pass: string): string {
  return Buffer.from(`\0${user}\0${pass}`).toString("base64");
}

function headerSafe(value: string): string {
  return value.replace(/[\r\n<>]/g, "");
}

function quoteAddress(value: string): string {
  return `<${headerSafe(value)}>`;
}

class SmtpSession {
  constructor(readonly socket: net.Socket) {}
  private buf = "";

  async read(expected: number): Promise<string> {
    for (;;) {
      const idx = this.buf.indexOf("\r\n");
      if (idx !== -1) {
        const line = this.buf.slice(0, idx);
        this.buf = this.buf.slice(idx + 2);
        const code = Number(line.slice(0, 3));
        if (line[3] === "-") continue;
        if (code !== expected) {
          throw new Error(`SMTP ${expected} expected, got: ${line}`);
        }
        return line;
      }
      const chunk: Buffer = await new Promise((resolve, reject) => {
        const onData = (data: Buffer) => {
          cleanup();
          resolve(data);
        };
        const onErr = (err: Error) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          this.socket.off("data", onData);
          this.socket.off("error", onErr);
        };
        this.socket.once("data", onData);
        this.socket.once("error", onErr);
      });
      this.buf += chunk.toString("utf8");
    }
  }

  async cmd(line: string, expected: number): Promise<string> {
    this.socket.write(`${line}\r\n`);
    return this.read(expected);
  }
}

async function upgradeStartTls(session: SmtpSession, host: string): Promise<SmtpSession> {
  await session.cmd("STARTTLS", 220);
  const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
    const s = tls.connect({ socket: session.socket, servername: host, host }, () => resolve(s));
    s.once("error", reject);
  });
  const next = new SmtpSession(socket);
  await next.cmd("EHLO vymanager", 250);
  return next;
}

async function connectSmtp(): Promise<SmtpSession> {
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT", "587"));
  const secure = env("SMTP_SECURE", port === 465 ? "true" : "false") === "true";
  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(s))
      : net.connect({ host, port }, () => resolve(s));
    s.once("error", reject);
  });
  let session = new SmtpSession(socket);
  await session.read(220);
  await session.cmd(`EHLO vymanager`, 250);
  if (!secure) {
    session = await upgradeStartTls(session, host);
  }
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  if (user) {
    await session.cmd(`AUTH PLAIN ${encodeAuthPlain(user, pass)}`, 235);
  }
  return session;
}

export async function sendTwoFactorOtp(data: {
  user: { email: string };
  otp: string;
}): Promise<void> {
  if (!smtpConfigured()) {
    throw new Error("Email OTP is not configured");
  }
  const from = env("SMTP_FROM");
  const to = data.user.email;
  const session = await connectSmtp();
  try {
    await session.cmd(`MAIL FROM:${quoteAddress(from)}`, 250);
    await session.cmd(`RCPT TO:${quoteAddress(to)}`, 250);
    await session.cmd("DATA", 354);
    const body = [
      `From: ${headerSafe(from)}`,
      `To: ${headerSafe(to)}`,
      "Subject: VyManager sign-in code",
      "Content-Type: text/plain; charset=utf-8",
      "",
      `Your VyManager sign-in code is ${data.otp}.`,
      "It expires in a few minutes. If you did not request this, ignore the email.",
      ".",
    ].join("\r\n");
    await session.cmd(body, 250);
    await session.cmd("QUIT", 221);
  } finally {
    session.socket.end();
  }
}
