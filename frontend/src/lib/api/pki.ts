import { apiClient } from "./client";

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
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
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

  async batchConfigure(itemName: string, operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/pki/batch", {
      item_name: itemName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Certificate Authority (CA)
  // ==========================================================================

  async createCA(name: string, config: {
    certificate?: string;
    description?: string;
    private_key?: string;
    password_protected?: boolean;
    crl?: string[];
    revoke?: boolean;
    system_install?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_ca" }];
    if (config.certificate) ops.push({ op: "set_ca_certificate", value: config.certificate });
    if (config.description) ops.push({ op: "set_ca_description", value: config.description });
    if (config.private_key) ops.push({ op: "set_ca_private_key", value: config.private_key });
    if (config.password_protected) ops.push({ op: "set_ca_private_password_protected" });
    if (config.crl) {
      for (const c of config.crl) {
        ops.push({ op: "set_ca_crl", value: c });
      }
    }
    if (config.revoke) ops.push({ op: "set_ca_revoke" });
    if (config.system_install) ops.push({ op: "set_ca_system_install" });
    return this.batchConfigure(name, ops);
  }

  async updateCA(name: string, current: PKICA, config: {
    certificate?: string;
    description?: string;
    private_key?: string;
    password_protected?: boolean;
    crl?: string[];
    revoke?: boolean;
    system_install?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.certificate !== undefined) {
      if (config.certificate) ops.push({ op: "set_ca_certificate", value: config.certificate });
      else if (current.certificate) ops.push({ op: "delete_ca_certificate" });
    }
    if (config.description !== undefined) {
      if (config.description) ops.push({ op: "set_ca_description", value: config.description });
      else if (current.description) ops.push({ op: "delete_ca_description" });
    }
    if (config.private_key !== undefined) {
      if (config.private_key) ops.push({ op: "set_ca_private_key", value: config.private_key });
      else if (current.private_key) ops.push({ op: "delete_ca_private_key" });
    }
    if (config.password_protected !== undefined) {
      if (config.password_protected) ops.push({ op: "set_ca_private_password_protected" });
      else if (current.password_protected) ops.push({ op: "delete_ca_private_password_protected" });
    }
    if (config.crl !== undefined) {
      // Delete old CRLs
      for (const c of current.crl || []) {
        ops.push({ op: "delete_ca_crl", value: c });
      }
      // Set new CRLs
      for (const c of config.crl) {
        ops.push({ op: "set_ca_crl", value: c });
      }
    }
    if (config.revoke !== undefined) {
      if (config.revoke) ops.push({ op: "set_ca_revoke" });
      else if (current.revoke) ops.push({ op: "delete_ca_revoke" });
    }
    if (config.system_install !== undefined) {
      if (config.system_install) ops.push({ op: "set_ca_system_install" });
      else if (current.system_install) ops.push({ op: "delete_ca_system_install" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteCA(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_ca" }]);
  }

  // ==========================================================================
  // Certificate
  // ==========================================================================

  async createCertificate(name: string, config: {
    certificate?: string;
    description?: string;
    private_key?: string;
    password_protected?: boolean;
    revoke?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_certificate" }];
    if (config.certificate) ops.push({ op: "set_certificate_cert", value: config.certificate });
    if (config.description) ops.push({ op: "set_certificate_description", value: config.description });
    if (config.private_key) ops.push({ op: "set_certificate_private_key", value: config.private_key });
    if (config.password_protected) ops.push({ op: "set_certificate_private_password_protected" });
    if (config.revoke) ops.push({ op: "set_certificate_revoke" });
    return this.batchConfigure(name, ops);
  }

  async createACMECertificate(name: string, config: {
    domain_names?: string[];
    email?: string;
    listen_address?: string;
    rsa_key_size?: string;
    url?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [
      { op: "create_certificate" },
      { op: "set_certificate_acme" },
    ];
    if (config.domain_names) {
      for (const d of config.domain_names) {
        ops.push({ op: "set_certificate_acme_domain_name", value: d });
      }
    }
    if (config.email) ops.push({ op: "set_certificate_acme_email", value: config.email });
    if (config.listen_address) ops.push({ op: "set_certificate_acme_listen_address", value: config.listen_address });
    if (config.rsa_key_size) ops.push({ op: "set_certificate_acme_rsa_key_size", value: config.rsa_key_size });
    if (config.url) ops.push({ op: "set_certificate_acme_url", value: config.url });
    return this.batchConfigure(name, ops);
  }

  async updateCertificate(name: string, current: PKICertificate, config: {
    certificate?: string;
    description?: string;
    private_key?: string;
    password_protected?: boolean;
    revoke?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.certificate !== undefined) {
      if (config.certificate) ops.push({ op: "set_certificate_cert", value: config.certificate });
      else if (current.certificate) ops.push({ op: "delete_certificate_cert" });
    }
    if (config.description !== undefined) {
      if (config.description) ops.push({ op: "set_certificate_description", value: config.description });
      else if (current.description) ops.push({ op: "delete_certificate_description" });
    }
    if (config.private_key !== undefined) {
      if (config.private_key) ops.push({ op: "set_certificate_private_key", value: config.private_key });
      else if (current.private_key) ops.push({ op: "delete_certificate_private_key" });
    }
    if (config.password_protected !== undefined) {
      if (config.password_protected) ops.push({ op: "set_certificate_private_password_protected" });
      else if (current.password_protected) ops.push({ op: "delete_certificate_private_password_protected" });
    }
    if (config.revoke !== undefined) {
      if (config.revoke) ops.push({ op: "set_certificate_revoke" });
      else if (current.revoke) ops.push({ op: "delete_certificate_revoke" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async updateACMECertificate(name: string, current: PKICertificate, config: {
    domain_names?: string[];
    email?: string;
    listen_address?: string;
    rsa_key_size?: string;
    url?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const currentAcme = current.acme;

    if (config.domain_names !== undefined) {
      // Delete old domains
      if (currentAcme?.domain_names?.length) {
        ops.push({ op: "delete_certificate_acme_domain_name_all" });
      }
      for (const d of config.domain_names) {
        ops.push({ op: "set_certificate_acme_domain_name", value: d });
      }
    }
    if (config.email !== undefined) {
      if (config.email) ops.push({ op: "set_certificate_acme_email", value: config.email });
      else if (currentAcme?.email) ops.push({ op: "delete_certificate_acme_email" });
    }
    if (config.listen_address !== undefined) {
      if (config.listen_address) ops.push({ op: "set_certificate_acme_listen_address", value: config.listen_address });
      else if (currentAcme?.listen_address) ops.push({ op: "delete_certificate_acme_listen_address" });
    }
    if (config.rsa_key_size !== undefined) {
      if (config.rsa_key_size) ops.push({ op: "set_certificate_acme_rsa_key_size", value: config.rsa_key_size });
      else if (currentAcme?.rsa_key_size) ops.push({ op: "delete_certificate_acme_rsa_key_size" });
    }
    if (config.url !== undefined) {
      if (config.url) ops.push({ op: "set_certificate_acme_url", value: config.url });
      else if (currentAcme?.url) ops.push({ op: "delete_certificate_acme_url" });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteCertificate(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_certificate" }]);
  }

  // ==========================================================================
  // Diffie-Hellman (DH)
  // ==========================================================================

  async createDH(name: string, config: {
    parameters?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_dh" }];
    if (config.parameters) ops.push({ op: "set_dh_parameters", value: config.parameters });
    return this.batchConfigure(name, ops);
  }

  async updateDH(name: string, current: PKIDH, config: {
    parameters?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    if (config.parameters !== undefined) {
      if (config.parameters) ops.push({ op: "set_dh_parameters", value: config.parameters });
      else if (current.parameters) ops.push({ op: "delete_dh_parameters" });
    }
    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteDH(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_dh" }]);
  }

  // ==========================================================================
  // Key Pair
  // ==========================================================================

  async createKeyPair(name: string, config: {
    private_key?: string;
    public_key?: string;
    password_protected?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_key_pair" }];
    if (config.private_key) ops.push({ op: "set_key_pair_private_key", value: config.private_key });
    if (config.public_key) ops.push({ op: "set_key_pair_public_key", value: config.public_key });
    if (config.password_protected) ops.push({ op: "set_key_pair_private_password_protected" });
    return this.batchConfigure(name, ops);
  }

  async updateKeyPair(name: string, current: PKIKeyPair, config: {
    private_key?: string;
    public_key?: string;
    password_protected?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    if (config.private_key !== undefined) {
      if (config.private_key) ops.push({ op: "set_key_pair_private_key", value: config.private_key });
      else if (current.private_key) ops.push({ op: "delete_key_pair_private_key" });
    }
    if (config.public_key !== undefined) {
      if (config.public_key) ops.push({ op: "set_key_pair_public_key", value: config.public_key });
      else if (current.public_key) ops.push({ op: "delete_key_pair_public_key" });
    }
    if (config.password_protected !== undefined) {
      if (config.password_protected) ops.push({ op: "set_key_pair_private_password_protected" });
      else if (current.password_protected) ops.push({ op: "delete_key_pair_private_password_protected" });
    }
    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteKeyPair(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_key_pair" }]);
  }

  // ==========================================================================
  // OpenSSH
  // ==========================================================================

  async createOpenSSH(name: string, config: {
    private_key?: string;
    public_key?: string;
    public_type?: string;
    password_protected?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_openssh" }];
    if (config.private_key) ops.push({ op: "set_openssh_private_key", value: config.private_key });
    if (config.public_key) ops.push({ op: "set_openssh_public_key", value: config.public_key });
    if (config.public_type) ops.push({ op: "set_openssh_public_type", value: config.public_type });
    if (config.password_protected) ops.push({ op: "set_openssh_private_password_protected" });
    return this.batchConfigure(name, ops);
  }

  async updateOpenSSH(name: string, current: PKIOpenSSH, config: {
    private_key?: string;
    public_key?: string;
    public_type?: string;
    password_protected?: boolean;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    if (config.private_key !== undefined) {
      if (config.private_key) ops.push({ op: "set_openssh_private_key", value: config.private_key });
      else if (current.private_key) ops.push({ op: "delete_openssh_private_key" });
    }
    if (config.public_key !== undefined) {
      if (config.public_key) ops.push({ op: "set_openssh_public_key", value: config.public_key });
      else if (current.public_key) ops.push({ op: "delete_openssh_public_key" });
    }
    if (config.public_type !== undefined) {
      if (config.public_type) ops.push({ op: "set_openssh_public_type", value: config.public_type });
      else if (current.public_type) ops.push({ op: "delete_openssh_public_type" });
    }
    if (config.password_protected !== undefined) {
      if (config.password_protected) ops.push({ op: "set_openssh_private_password_protected" });
      else if (current.password_protected) ops.push({ op: "delete_openssh_private_password_protected" });
    }
    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteOpenSSH(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_openssh" }]);
  }

  // ==========================================================================
  // OpenVPN Shared Secret
  // ==========================================================================

  async createOpenVPNSecret(name: string, config: {
    key?: string;
    version?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "create_openvpn_shared_secret" }];
    if (config.key) ops.push({ op: "set_openvpn_shared_secret_key", value: config.key });
    if (config.version) ops.push({ op: "set_openvpn_shared_secret_version", value: config.version });
    return this.batchConfigure(name, ops);
  }

  async updateOpenVPNSecret(name: string, current: PKIOpenVPNSharedSecret, config: {
    key?: string;
    version?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    if (config.key !== undefined) {
      if (config.key) ops.push({ op: "set_openvpn_shared_secret_key", value: config.key });
      else if (current.key) ops.push({ op: "delete_openvpn_shared_secret_key" });
    }
    if (config.version !== undefined) {
      if (config.version) ops.push({ op: "set_openvpn_shared_secret_version", value: config.version });
      else if (current.version) ops.push({ op: "delete_openvpn_shared_secret_version" });
    }
    if (ops.length === 0) return { success: true };
    return this.batchConfigure(name, ops);
  }

  async deleteOpenVPNSecret(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(name, [{ op: "delete_openvpn_shared_secret" }]);
  }

  // ==========================================================================
  // X509 Defaults
  // ==========================================================================

  async updateX509Defaults(current: PKIX509Defaults, config: {
    country?: string;
    locality?: string;
    organization?: string;
    state?: string;
  }): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    if (config.country !== undefined) {
      if (config.country) ops.push({ op: "set_x509_default_country", value: config.country });
      else if (current.country) ops.push({ op: "delete_x509_default_country" });
    }
    if (config.locality !== undefined) {
      if (config.locality) ops.push({ op: "set_x509_default_locality", value: config.locality });
      else if (current.locality) ops.push({ op: "delete_x509_default_locality" });
    }
    if (config.organization !== undefined) {
      if (config.organization) ops.push({ op: "set_x509_default_organization", value: config.organization });
      else if (current.organization) ops.push({ op: "delete_x509_default_organization" });
    }
    if (config.state !== undefined) {
      if (config.state) ops.push({ op: "set_x509_default_state", value: config.state });
      else if (current.state) ops.push({ op: "delete_x509_default_state" });
    }

    if (ops.length === 0) return { success: true };
    // X509 defaults use "pki" as the item_name placeholder
    return this.batchConfigure("pki", ops);
  }
}

export const pkiService = new PKIService();
