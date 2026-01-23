-- Add Telegram notification fields to alert_rules
ALTER TABLE "alert_rules" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "alert_rules" ADD COLUMN IF NOT EXISTS "telegramBotToken" TEXT;
