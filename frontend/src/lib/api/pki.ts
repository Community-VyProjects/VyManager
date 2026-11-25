import { apiClient } from "./client";
import {
  caCreateOps,
  caUpdateOps,
  certificateCreateOps,
  certificateUpdateOps,
  deletePKIOps,
  dhCreateOps,
  dhUpdateOps,
  keyPairCreateOps,
  keyPairUpdateOps,
  openSSHCreateOps,
  openSSHUpdateOps,
  openVPNSecretCreateOps,
  openVPNSecretUpdateOps,
  x509DefaultsClearOps,
  x509DefaultsUpdateOps,
  type CAForm,
  type CertificateForm,
  type DHForm,
  type KeyPairForm,
  type OpenSSHForm,
  type OpenVPNSecretForm,
  type X509DefaultsForm,
} from "./pki-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PKICA {
  name: string;
  certificate?: string | null;
  crl: string[];
  description?: string | null;
  private_key?: string | null;
  password_protected: boolean;
  revoke: boolean;
  system_install: boolean;
}

export interface PKICertificateACME {
  domain_names: string[];
  email?: string | null;
  listen_address?: string | null;
  rsa_key_size?: string | null;
  url?: string | null;
}

export interface PKICertificate {
  name: string;
  certificate?: string | null;
  description?: string | null;
  private_key?: string | null;
  password_protected: boolean;
  revoke: boolean;
  acme?: PKICertificateACME | null;
}

export interface PKIDH {
  name: string;
  parameters?: string | null;
}

export interface PKIKeyPair {
  name: string;
  private_key?: string | null;
  password_protected: boolean;
  public_key?: string | null;
}

export interface PKIOpenSSH {
  name: string;
  private_key?: string | null;
  password_protected: boolean;
  public_key?: string | null;
  public_type?: string | null;
}

export interface PKIOpenVPNSharedSecret {
  name: string;
  key?: string | null;
  version?: string | null;
}

export interface PKIX509Defaults {
  country?: string | null;
  locality?: string | null;
  organization?: string | null;
  state?: string | null;
}

export interface PKIConfigResponse {
  configured: boolean;
  ca: PKICA[];
  certificates: PKICertificate[];
  dh: PKIDH[];
  key_pairs: PKIKeyPair[];
  openssh: PKIOpenSSH[];
  openvpn_shared_secrets: PKIOpenVPNSharedSecret[];
  x509_defaults: PKIX509Defaults;
  totals: {
    ca: number;
    certificates: number;
    dh: number;
    key_pairs: number;
    openssh: number;
    openvpn_shared_secrets: number;
  };
}

export interface PKICapabilities {
  version: string;
  features: {
    ca: { supported: boolean; description: string; settings: string[] };
    certificate: { supported: boolean; description: string; settings: string[] };
    acme: {
      supported: boolean;
      description: string;
      settings: string[];
      rsa_key_sizes: string[];
      listen_address_ipv6: boolean;
    };
    dh: { supported: boolean; description: string };
    key_pair: { supported: boolean; description: string; settings: string[] };
    openssh: { supported: boolean; description: string; settings: string[]; public_types: string[] };
    openvpn_shared_secret: { supported: boolean; description: string; settings: string[] };
    x509_defaults: { supported: boolean; description: string; settings: string[] };
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface GenerateCARequest {
  name: string;
  key_type: "rsa" | "ec";
  key_size: number;
  country?: string;
  state?: string;
  locality?: string;
  organization?: string;
  common_name: string;
  days: number;
  encrypt_key: boolean;
  passphrase?: string;
  revoke: boolean;
  system_install: boolean;
}

export interface GenerateKeyPairRequest {
  name: string;
  key_type: "rsa" | "ec";
  key_size: number;
  encrypt_key: boolean;
  passphrase?: string;
}

export interface GenerateDHRequest {
  name: string;
  key_size: number;
}

export interface GenerateOpenSSHRequest {
  name: string;
  key_size: number;
}

export interface GenerateCertificateRequest {
  name: string;
  ca_name: string;
  key_type: "rsa" | "ec";
  key_size: number;
  country?: string;
  state?: string;
  locality?: string;
  organization?: string;
  common_name: string;
  days: number;
  subject_alt_names?: string[];
  encrypt_key: boolean;
  passphrase?: string;
}

// ============================================================================
// API Service
// ============================================================================

class PKIService {
  async getCapabilities(): Promise<PKICapabilities> {
    return apiClient.get<PKICapabilities>("/vyos/pki/capabilities");
  }

  async getConfig(refresh = false): Promise<PKIConfigResponse> {
    return apiClient.get<PKIConfigResponse>("/vyos/pki/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  async generateCA(request: GenerateCARequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/generate-ca", request);
    await this.refreshConfig();
    return result;
  }

  async generateKeyPair(request: GenerateKeyPairRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/generate-key-pair", request);
    await this.refreshConfig();
    return result;
  }

  async generateDH(request: GenerateDHRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/generate-dh", request);
    await this.refreshConfig();
    return result;
  }

  async generateCertificate(request: GenerateCertificateRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/generate-certificate", request);
    await this.refreshConfig();
    return result;
  }

  async generateOpenSSH(request: GenerateOpenSSHRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/generate-openssh", request);
    await this.refreshConfig();
    return result;
  }

  async generateOpenVPNSecret(name: string): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/generate-openvpn-shared-secret", { name });
    await this.refreshConfig();
    return result;
  }

  async revealValue(itemType: string, itemName: string, field: string): Promise<string | null> {
    const result = await apiClient.post<{ value: string | null }>("/vyos/pki/reveal", {
      item_type: itemType,
      item_name: itemName,
      field,
    });
    return result.value;
  }

  /**
   * One commit. Item ops carry the item name; the global ops (x509 defaults,
   * delete_pki) are sent with itemName null. An empty list sends nothing.
   */
  async batchConfigure(itemName: string | null, operations: BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return { success: true };
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/batch", {
      ...(itemName === null ? {} : { item_name: itemName }),
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Certificate Authority (CA)
  // ==========================================================================

  async createCA(name: string, form: CAForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, caCreateOps(form));
  }

  async updateCA(name: string, current: PKICA, form: CAForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, caUpdateOps(current, form));
  }

  async deleteCA(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ca" }]);
  }

  // ==========================================================================
  // Certificate (manual and ACME)
  // ==========================================================================

  async createCertificate(name: string, form: CertificateForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, certificateCreateOps(form));
  }

  async updateCertificate(name: string, current: PKICertificate, form: CertificateForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, certificateUpdateOps(current, form));
  }

  async deleteCertificate(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_certificate" }]);
  }

  // ==========================================================================
  // Diffie-Hellman (DH)
  // ==========================================================================

  async createDH(name: string, form: DHForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, dhCreateOps(form));
  }

  async updateDH(name: string, current: PKIDH, form: DHForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, dhUpdateOps(current, form));
  }

  async deleteDH(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_dh" }]);
  }

  // ==========================================================================
  // Key Pair
  // ==========================================================================

  async createKeyPair(name: string, form: KeyPairForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, keyPairCreateOps(form));
  }

  async updateKeyPair(name: string, current: PKIKeyPair, form: KeyPairForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, keyPairUpdateOps(current, form));
  }

  async deleteKeyPair(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_key_pair" }]);
  }

  // ==========================================================================
  // OpenSSH
  // ==========================================================================

  async createOpenSSH(name: string, form: OpenSSHForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, openSSHCreateOps(form));
  }

  async updateOpenSSH(name: string, current: PKIOpenSSH, form: OpenSSHForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, openSSHUpdateOps(current, form));
  }

  async deleteOpenSSH(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_openssh" }]);
  }

  // ==========================================================================
  // OpenVPN Shared Secret
  // ==========================================================================

  async createOpenVPNSecret(name: string, form: OpenVPNSecretForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, openVPNSecretCreateOps(form));
  }

  async updateOpenVPNSecret(name: string, current: PKIOpenVPNSharedSecret, form: OpenVPNSecretForm): Promise<VyOSResponse> {
    return this.batchConfigure(name, openVPNSecretUpdateOps(current, form));
  }

  async deleteOpenVPNSecret(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_openvpn_shared_secret" }]);
  }

  // ==========================================================================
  // Global: X509 defaults and the whole PKI tree
  // ==========================================================================

  async updateX509Defaults(current: PKIX509Defaults, form: X509DefaultsForm): Promise<VyOSResponse> {
    return this.batchConfigure(null, x509DefaultsUpdateOps(current, form));
  }

  async clearX509Defaults(): Promise<VyOSResponse> {
    return this.batchConfigure(null, x509DefaultsClearOps());
  }

  async deleteAllPKI(): Promise<VyOSResponse> {
    return this.batchConfigure(null, deletePKIOps());
  }
}

export const pkiService = new PKIService();
