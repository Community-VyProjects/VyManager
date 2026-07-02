import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/vyos-management-api",
    },
    {
      type: "category",
      label: "permissions",
      items: [
        {
          type: "doc",
          id: "api/get-permissions-vyos-permissions-get",
          label: "Get Permissions",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "session",
      items: [
        {
          type: "doc",
          id: "api/get-onboarding-status-session-onboarding-status-get",
          label: "Get Onboarding Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-current-session-session-current-get",
          label: "Get Current Session",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/connect-to-instance-session-connect-post",
          label: "Connect To Instance",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/disconnect-from-instance-session-disconnect-post",
          label: "Disconnect From Instance",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-user-sites-session-sites-get",
          label: "List User Sites",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-site-session-sites-post",
          label: "Create Site",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-site-instances-session-sites-site-id-instances-get",
          label: "List Site Instances",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-site-session-sites-site-id-put",
          label: "Update Site",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-site-session-sites-site-id-delete",
          label: "Delete Site",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/create-instance-session-instances-post",
          label: "Create Instance",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-instance-session-instances-instance-id-put",
          label: "Update Instance",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-instance-session-instances-instance-id-delete",
          label: "Delete Instance",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/create-backup-session-backup-post",
          label: "Create Backup",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/preview-restore-session-restore-preview-post",
          label: "Preview Restore",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/restore-backup-session-restore-post",
          label: "Restore Backup",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-active-auth-sessions-session-auth-sessions-get",
          label: "Get Active Auth Sessions",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/revoke-auth-session-session-revoke-session-post",
          label: "Revoke Auth Session",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ethernet-interface",
      items: [
        {
          type: "doc",
          id: "api/get-ethernet-capabilities-vyos-ethernet-capabilities-get",
          label: "Get Ethernet Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ethernet-config-vyos-ethernet-config-get",
          label: "Get Ethernet Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/configure-interface-batch-vyos-ethernet-batch-post",
          label: "Configure Interface Batch",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "dummy-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-dummy-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-dummy-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-dummy-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "bonding-interface",
      items: [
        {
          type: "doc",
          id: "api/get-bonding-capabilities-vyos-bonding-capabilities-get",
          label: "Get Bonding Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-bonding-config-vyos-bonding-config-get",
          label: "Get Bonding Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/configure-bonding-batch-vyos-bonding-batch-post",
          label: "Configure Bonding Batch",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "bridge-interface",
      items: [
        {
          type: "doc",
          id: "api/get-bridge-capabilities-vyos-bridge-capabilities-get",
          label: "Get Bridge Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-bridge-config-vyos-bridge-config-get",
          label: "Get Bridge Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/configure-bridge-batch-vyos-bridge-batch-post",
          label: "Configure Bridge Batch",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "geneve-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-geneve-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-geneve-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-geneve-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "input-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-input-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-input-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-input-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "l2tpv3-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-l-2-tpv-3-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-l-2-tpv-3-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-l-2-tpv-3-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "loopback-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-loopback-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-loopback-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-loopback-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "macsec-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-macsec-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-macsec-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-macsec-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "openvpn-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-openvpn-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-openvpn-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-openvpn-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-export-options-vyos-openvpn-export-options-get",
          label: "Get Export Options",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/client-export-vyos-openvpn-client-export-post",
          label: "Client Export",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "pppoe-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-pppoe-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-pppoe-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-pppoe-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "pseudo-ethernet-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-pseudo-ethernet-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-pseudo-ethernet-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-pseudo-ethernet-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "sstpc-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-sstpc-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-sstpc-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-sstpc-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "virtual-ethernet-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-virtual-ethernet-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-virtual-ethernet-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-virtual-ethernet-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "vpp-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-vpp-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-vpp-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-vpp-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "vti-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-vti-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-vti-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-vti-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "wireless-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-wireless-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-wireless-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-wireless-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "wwan-interface",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-wwan-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-wwan-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-wwan-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "firewall-groups",
      items: [
        {
          type: "doc",
          id: "api/get-groups-capabilities-vyos-firewall-groups-capabilities-get",
          label: "Get Groups Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-groups-config-vyos-firewall-groups-config-get",
          label: "Get Groups Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/configure-group-batch-vyos-firewall-groups-batch-post",
          label: "Configure Group Batch",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "firewall_ipv4",
      items: [
        {
          type: "doc",
          id: "api/get-firewall-ipv-4-capabilities-vyos-firewall-ipv-4-capabilities-get",
          label: "Get Firewall Ipv4 Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-firewall-ipv-4-config-vyos-firewall-ipv-4-config-get",
          label: "Get Firewall Ipv4 Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/firewall-ipv-4-batch-configure-vyos-firewall-ipv-4-batch-post",
          label: "Firewall Ipv4 Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/firewall-ipv-4-reorder-rules-vyos-firewall-ipv-4-reorder-post",
          label: "Firewall Ipv4 Reorder Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "firewall_ipv6",
      items: [
        {
          type: "doc",
          id: "api/get-firewall-ipv-6-capabilities-vyos-firewall-ipv-6-capabilities-get",
          label: "Get Firewall Ipv6 Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-firewall-ipv-6-config-vyos-firewall-ipv-6-config-get",
          label: "Get Firewall Ipv6 Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/firewall-ipv-6-batch-configure-vyos-firewall-ipv-6-batch-post",
          label: "Firewall Ipv6 Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/firewall-ipv-6-reorder-rules-vyos-firewall-ipv-6-reorder-post",
          label: "Firewall Ipv6 Reorder Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "firewall-bridge",
      items: [
        {
          type: "doc",
          id: "api/get-bridge-capabilities-vyos-firewall-bridge-capabilities-get",
          label: "Get Bridge Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-available-interfaces-vyos-firewall-bridge-interfaces-get",
          label: "Get Available Interfaces",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-bridge-config-vyos-firewall-bridge-config-get",
          label: "Get Bridge Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/configure-bridge-batch-vyos-firewall-bridge-batch-post",
          label: "Configure Bridge Batch",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-bridge-rules-vyos-firewall-bridge-reorder-post",
          label: "Reorder Bridge Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "firewall-flowtables",
      items: [
        {
          type: "doc",
          id: "api/get-flowtables-capabilities-vyos-firewall-flowtables-capabilities-get",
          label: "Get Flowtables Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-flowtables-config-vyos-firewall-flowtables-config-get",
          label: "Get Flowtables Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-flowtable-vyos-firewall-flowtables-batch-post",
          label: "Batch Configure Flowtable",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/delete-flowtable-vyos-firewall-flowtables-flowtable-name-delete",
          label: "Delete Flowtable",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "firewall-zones",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-firewall-zones-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-firewall-zones-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-firewall-zones-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/provision-zone-vyos-firewall-zones-provision-post",
          label: "Provision Zone",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/deprovision-zone-vyos-firewall-zones-deprovision-post",
          label: "Deprovision Zone",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "firewall_separators",
      items: [
        {
          type: "doc",
          id: "api/list-separators-vyos-firewall-separators-get",
          label: "List Separators",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-separators-vyos-firewall-separators-batch-post",
          label: "Batch Separators",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "nat",
      items: [
        {
          type: "doc",
          id: "api/get-nat-capabilities-vyos-nat-capabilities-get",
          label: "Get Nat Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-nat-config-vyos-nat-config-get",
          label: "Get Nat Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-nat-vyos-nat-batch-post",
          label: "Batch Configure Nat",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-nat-rules-vyos-nat-reorder-post",
          label: "Reorder Nat Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "nat64",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-nat-64-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-nat-64-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-nat-64-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-nat-64-rules-vyos-nat-64-reorder-post",
          label: "Reorder Nat64 Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "nat66",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-nat-66-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-nat-66-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-nat-66-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-nat-66-rules-vyos-nat-66-reorder-post",
          label: "Reorder Nat66 Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "dhcp",
      items: [
        {
          type: "doc",
          id: "api/get-dhcp-capabilities-vyos-dhcp-capabilities-get",
          label: "Get Dhcp Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-dhcp-config-vyos-dhcp-config-get",
          label: "Get Dhcp Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-dhcp-leases-vyos-dhcp-leases-get",
          label: "Get Dhcp Leases",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/clear-dhcp-lease-vyos-dhcp-leases-clear-post",
          label: "Clear Dhcp Lease",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/dhcp-batch-configure-vyos-dhcp-batch-post",
          label: "Dhcp Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "static-routes",
      items: [
        {
          type: "doc",
          id: "api/get-static-routes-capabilities-vyos-static-routes-capabilities-get",
          label: "Get Static Routes Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-static-routes-config-vyos-static-routes-config-get",
          label: "Get Static Routes Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/static-routes-batch-configure-vyos-static-routes-batch-post",
          label: "Static Routes Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/arp-batch-configure-vyos-static-routes-arp-batch-post",
          label: "Arp Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/mroute-batch-configure-vyos-static-routes-mroute-batch-post",
          label: "Mroute Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/neighbor-proxy-batch-configure-vyos-static-routes-neighbor-proxy-batch-post",
          label: "Neighbor Proxy Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/table-batch-configure-vyos-static-routes-table-batch-post",
          label: "Table Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/table-route-batch-configure-vyos-static-routes-table-route-batch-post",
          label: "Table Route Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "route-map",
      items: [
        {
          type: "doc",
          id: "api/get-route-map-capabilities-vyos-route-map-capabilities-get",
          label: "Get Route Map Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-route-map-config-vyos-route-map-config-get",
          label: "Get Route Map Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/route-map-batch-configure-vyos-route-map-batch-post",
          label: "Route Map Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-route-map-rules-vyos-route-map-reorder-post",
          label: "Reorder Route Map Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "access-list",
      items: [
        {
          type: "doc",
          id: "api/get-access-list-capabilities-vyos-access-list-capabilities-get",
          label: "Get Access List Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-access-list-config-vyos-access-list-config-get",
          label: "Get Access List Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/access-list-batch-configure-vyos-access-list-batch-post",
          label: "Access List Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-access-list-rules-vyos-access-list-reorder-post",
          label: "Reorder Access List Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "prefix-list",
      items: [
        {
          type: "doc",
          id: "api/get-prefix-list-capabilities-vyos-prefix-list-capabilities-get",
          label: "Get Prefix List Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-prefix-list-config-vyos-prefix-list-config-get",
          label: "Get Prefix List Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/prefix-list-batch-configure-vyos-prefix-list-batch-post",
          label: "Prefix List Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-prefix-list-rules-vyos-prefix-list-reorder-post",
          label: "Reorder Prefix List Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "local-route",
      items: [
        {
          type: "doc",
          id: "api/get-local-route-capabilities-vyos-local-route-capabilities-get",
          label: "Get Local Route Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-local-route-config-vyos-local-route-config-get",
          label: "Get Local Route Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/local-route-batch-configure-vyos-local-route-batch-post",
          label: "Local Route Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/local-route-reorder-rules-vyos-local-route-reorder-post",
          label: "Local Route Reorder Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "route",
      items: [
        {
          type: "doc",
          id: "api/get-route-capabilities-vyos-route-capabilities-get",
          label: "Get Route Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-route-config-vyos-route-config-get",
          label: "Get Route Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/route-batch-configure-vyos-route-batch-post",
          label: "Route Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-rules-vyos-route-reorder-post",
          label: "Reorder Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "as-path-list",
      items: [
        {
          type: "doc",
          id: "api/get-as-path-list-capabilities-vyos-as-path-list-capabilities-get",
          label: "Get As Path List Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-as-path-list-config-vyos-as-path-list-config-get",
          label: "Get As Path List Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/as-path-list-batch-configure-vyos-as-path-list-batch-post",
          label: "As Path List Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-as-path-list-rules-vyos-as-path-list-reorder-post",
          label: "Reorder As Path List Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "community-list",
      items: [
        {
          type: "doc",
          id: "api/get-community-list-capabilities-vyos-community-list-capabilities-get",
          label: "Get Community List Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-community-list-config-vyos-community-list-config-get",
          label: "Get Community List Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/community-list-batch-configure-vyos-community-list-batch-post",
          label: "Community List Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-community-list-rules-vyos-community-list-reorder-post",
          label: "Reorder Community List Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "extcommunity-list",
      items: [
        {
          type: "doc",
          id: "api/get-extcommunity-list-capabilities-vyos-extcommunity-list-capabilities-get",
          label: "Get Extcommunity List Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-extcommunity-list-config-vyos-extcommunity-list-config-get",
          label: "Get Extcommunity List Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/extcommunity-list-batch-configure-vyos-extcommunity-list-batch-post",
          label: "Extcommunity List Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-extcommunity-list-rules-vyos-extcommunity-list-reorder-post",
          label: "Reorder Extcommunity List Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "large-community-list",
      items: [
        {
          type: "doc",
          id: "api/get-large-community-list-capabilities-vyos-large-community-list-capabilities-get",
          label: "Get Large Community List Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-large-community-list-config-vyos-large-community-list-config-get",
          label: "Get Large Community List Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/large-community-list-batch-configure-vyos-large-community-list-batch-post",
          label: "Large Community List Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reorder-large-community-list-rules-vyos-large-community-list-reorder-post",
          label: "Reorder Large Community List Rules",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "firewall-global-options",
      items: [
        {
          type: "doc",
          id: "api/get-firewall-global-options-capabilities-vyos-firewall-global-options-capabilities-get",
          label: "Get Firewall Global Options Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-firewall-global-options-config-vyos-firewall-global-options-config-get",
          label: "Get Firewall Global Options Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/firewall-global-options-batch-configure-vyos-firewall-global-options-batch-post",
          label: "Firewall Global Options Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-firewall-global-options-vyos-firewall-global-options-update-post",
          label: "Update Firewall Global Options",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "wireguard",
      items: [
        {
          type: "doc",
          id: "api/get-wireguard-capabilities-vyos-vpn-wireguard-capabilities-get",
          label: "Get Wireguard Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-wireguard-config-vyos-vpn-wireguard-config-get",
          label: "Get Wireguard Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/wireguard-interface-batch-vyos-vpn-wireguard-interface-batch-post",
          label: "Wireguard Interface Batch",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/wireguard-peer-batch-vyos-vpn-wireguard-peer-batch-post",
          label: "Wireguard Peer Batch",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-keypair-vyos-vpn-wireguard-generate-keypair-post",
          label: "Generate Keypair",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-psk-vyos-vpn-wireguard-generate-psk-post",
          label: "Generate Psk",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-interface-status-vyos-vpn-wireguard-interface-interface-name-status-get",
          label: "Get Interface Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-interface-public-key-vyos-vpn-wireguard-interface-interface-name-public-key-get",
          label: "Get Interface Public Key",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "babel",
      items: [
        {
          type: "doc",
          id: "api/get-babel-capabilities-vyos-babel-capabilities-get",
          label: "Get Babel Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-babel-config-vyos-babel-config-get",
          label: "Get Babel Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/babel-batch-configure-vyos-babel-batch-post",
          label: "Babel Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "bfd",
      items: [
        {
          type: "doc",
          id: "api/get-bfd-capabilities-vyos-bfd-capabilities-get",
          label: "Get Bfd Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-bfd-config-vyos-bfd-config-get",
          label: "Get Bfd Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-bfd-status-vyos-bfd-status-get",
          label: "Get Bfd Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/bfd-batch-configure-vyos-bfd-batch-post",
          label: "Bfd Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "bgp",
      items: [
        {
          type: "doc",
          id: "api/get-bgp-capabilities-vyos-bgp-capabilities-get",
          label: "Get Bgp Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-bgp-config-vyos-bgp-config-get",
          label: "Get Bgp Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/bgp-batch-configure-vyos-bgp-batch-post",
          label: "Bgp Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "failover",
      items: [
        {
          type: "doc",
          id: "api/get-failover-capabilities-vyos-failover-capabilities-get",
          label: "Get Failover Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-failover-config-vyos-failover-config-get",
          label: "Get Failover Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/failover-batch-configure-vyos-failover-batch-post",
          label: "Failover Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "igmp-proxy",
      items: [
        {
          type: "doc",
          id: "api/get-igmp-proxy-capabilities-vyos-igmp-proxy-capabilities-get",
          label: "Get Igmp Proxy Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-igmp-proxy-config-vyos-igmp-proxy-config-get",
          label: "Get Igmp Proxy Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/igmp-proxy-batch-configure-vyos-igmp-proxy-batch-post",
          label: "Igmp Proxy Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ospf",
      items: [
        {
          type: "doc",
          id: "api/get-ospf-capabilities-vyos-ospf-capabilities-get",
          label: "Get Ospf Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ospf-config-vyos-ospf-config-get",
          label: "Get Ospf Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ospf-batch-configure-vyos-ospf-batch-post",
          label: "Ospf Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ospfv3",
      items: [
        {
          type: "doc",
          id: "api/get-ospfv-3-capabilities-vyos-ospfv-3-capabilities-get",
          label: "Get Ospfv3 Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ospfv-3-config-vyos-ospfv-3-config-get",
          label: "Get Ospfv3 Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ospfv-3-batch-configure-vyos-ospfv-3-batch-post",
          label: "Ospfv3 Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "vrf",
      items: [
        {
          type: "doc",
          id: "api/get-vrf-capabilities-vyos-vrf-capabilities-get",
          label: "Get Vrf Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-vrf-config-vyos-vrf-config-get",
          label: "Get Vrf Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/vrf-batch-configure-vyos-vrf-batch-post",
          label: "Vrf Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "system",
      items: [
        {
          type: "doc",
          id: "api/update-general-settings-vyos-system-general-post",
          label: "Update General Settings",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-login-settings-vyos-system-login-settings-post",
          label: "Update Login Settings",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-watchdog-settings-vyos-system-watchdog-settings-post",
          label: "Update Watchdog Settings",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-archive-files-endpoint-vyos-system-config-archive-files-get",
          label: "List Archive Files Endpoint",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-archive-diff-vyos-system-config-archive-diff-get",
          label: "Get Archive Diff",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/restore-config-vyos-system-config-restore-post",
          label: "Restore Config",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-system-capabilities-vyos-system-capabilities-get",
          label: "Get System Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-system-config-vyos-system-config-get",
          label: "Get System Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/system-batch-configure-vyos-system-batch-post",
          label: "System Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-system-info-vyos-system-info-get",
          label: "Get System Info",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "power",
      items: [
        {
          type: "doc",
          id: "api/reboot-system-vyos-power-reboot-post",
          label: "Reboot System",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/poweroff-system-vyos-power-poweroff-post",
          label: "Poweroff System",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-power-status-vyos-power-status-get",
          label: "Get Power Status",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "config",
      items: [
        {
          type: "doc",
          id: "api/get-config-snapshot-vyos-config-snapshot-get",
          label: "Get Config Snapshot",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-diff-vyos-config-diff-get",
          label: "Get Config Diff",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/save-config-vyos-config-save-post",
          label: "Save Config",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/discard-config-vyos-config-discard-post",
          label: "Discard Config",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/refresh-config-vyos-config-refresh-post",
          label: "Refresh Config",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-commit-confirm-status-vyos-config-commit-confirm-status-get",
          label: "Get Commit Confirm Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/confirm-commit-vyos-config-commit-confirm-confirm-post",
          label: "Confirm Commit",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "show",
      items: [
        {
          type: "doc",
          id: "api/get-interface-counters-vyos-show-interface-counters-get",
          label: "Get Interface Counters",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-all-interfaces-vyos-show-all-interfaces-get",
          label: "Get All Interfaces",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-available-ethernet-interfaces-vyos-show-available-ethernet-interfaces-get",
          label: "Get Available Ethernet Interfaces",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-system-updates-vyos-show-system-updates-get",
          label: "Get System Updates",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/dashboard-stream-vyos-show-stream-get",
          label: "Dashboard Stream",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "site-updates",
      items: [
        {
          type: "doc",
          id: "api/get-site-updates-vyos-sites-site-id-updates-get",
          label: "Get Site Updates",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "dashboard",
      items: [
        {
          type: "doc",
          id: "api/get-dashboard-layout-dashboard-layout-get",
          label: "Get Dashboard Layout",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/save-dashboard-layout-dashboard-layout-post",
          label: "Save Dashboard Layout",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "user-management",
      items: [
        {
          type: "doc",
          id: "api/get-my-permissions-user-management-my-permissions-get",
          label: "Get My Permissions",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/list-users-user-management-users-get",
          label: "List Users",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-user-user-management-users-post",
          label: "Create User",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-user-user-management-users-user-id-get",
          label: "Get User",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-user-user-management-users-user-id-put",
          label: "Update User",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-user-user-management-users-user-id-delete",
          label: "Delete User",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/get-user-assignments-user-management-users-user-id-assignments-get",
          label: "Get User Assignments",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/assign-user-to-instances-user-management-assignments-post",
          label: "Assign User To Instances",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/remove-assignment-user-management-assignments-assignment-id-delete",
          label: "Remove Assignment",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/get-instance-users-user-management-instances-instance-id-users-get",
          label: "Get Instance Users",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "tokens",
      items: [
        {
          type: "doc",
          id: "api/list-tokens-tokens-get",
          label: "List Tokens",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-token-tokens-post",
          label: "Create Token",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/revoke-token-tokens-token-id-delete",
          label: "Revoke Token",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "operations",
      items: [
        {
          type: "doc",
          id: "api/list-discoverable-features-vyos-operations-get",
          label: "List Discoverable Features",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-feature-operations-vyos-operations-feature-get",
          label: "Get Feature Operations",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "monitoring",
      items: [
        {
          type: "doc",
          id: "api/generate-ssh-key-vyos-monitoring-instances-instance-id-ssh-key-generate-post",
          label: "Generate Ssh Key",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-ssh-key-status-vyos-monitoring-instances-instance-id-ssh-key-status-get",
          label: "Get Ssh Key Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/mark-ssh-key-configured-vyos-monitoring-instances-instance-id-ssh-key-mark-configured-post",
          label: "Mark Ssh Key Configured",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/delete-ssh-key-vyos-monitoring-instances-instance-id-ssh-key-delete",
          label: "Delete Ssh Key",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/get-monitoring-status-vyos-monitoring-status-get",
          label: "Get Monitoring Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/list-commands-vyos-monitoring-commands-get",
          label: "List Commands",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "high-availability",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-high-availability-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-high-availability-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-high-availability-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "load-balancing",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-load-balancing-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-load-balancing-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/batch-configure-vyos-load-balancing-batch-post",
          label: "Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "isis",
      items: [
        {
          type: "doc",
          id: "api/get-isis-capabilities-vyos-isis-capabilities-get",
          label: "Get Isis Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-isis-config-vyos-isis-config-get",
          label: "Get Isis Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/isis-batch-configure-vyos-isis-batch-post",
          label: "Isis Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "openfabric",
      items: [
        {
          type: "doc",
          id: "api/get-capabilities-vyos-openfabric-capabilities-get",
          label: "Get Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-vyos-openfabric-config-get",
          label: "Get Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/openfabric-batch-configure-vyos-openfabric-batch-post",
          label: "Openfabric Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "mpls",
      items: [
        {
          type: "doc",
          id: "api/get-mpls-capabilities-vyos-mpls-capabilities-get",
          label: "Get Mpls Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-mpls-config-vyos-mpls-config-get",
          label: "Get Mpls Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/mpls-batch-configure-vyos-mpls-batch-post",
          label: "Mpls Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ipsec",
      items: [
        {
          type: "doc",
          id: "api/get-ipsec-capabilities-vyos-vpn-ipsec-capabilities-get",
          label: "Get Ipsec Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ipsec-config-vyos-vpn-ipsec-config-get",
          label: "Get Ipsec Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ipsec-batch-configure-vyos-vpn-ipsec-batch-post",
          label: "Ipsec Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-ipsec-status-vyos-vpn-ipsec-status-get",
          label: "Get Ipsec Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reset-ipsec-peer-vyos-vpn-ipsec-reset-peer-post",
          label: "Reset Ipsec Peer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reset-ipsec-all-peers-vyos-vpn-ipsec-reset-all-post",
          label: "Reset Ipsec All Peers",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reset-ipsec-remote-access-vyos-vpn-ipsec-reset-remote-access-post",
          label: "Reset Ipsec Remote Access",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "l2tp",
      items: [
        {
          type: "doc",
          id: "api/get-l-2-tp-capabilities-vyos-vpn-l-2-tp-capabilities-get",
          label: "Get L2Tp Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-l-2-tp-config-vyos-vpn-l-2-tp-config-get",
          label: "Get L2Tp Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/l-2-tp-batch-configure-vyos-vpn-l-2-tp-batch-post",
          label: "L2Tp Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "pki",
      items: [
        {
          type: "doc",
          id: "api/get-pki-capabilities-vyos-pki-capabilities-get",
          label: "Get Pki Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-pki-config-vyos-pki-config-get",
          label: "Get Pki Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reveal-pki-value-vyos-pki-reveal-post",
          label: "Reveal Pki Value",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/pki-batch-configure-vyos-pki-batch-post",
          label: "Pki Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-ca-vyos-pki-generate-ca-post",
          label: "Generate Ca",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-key-pair-vyos-pki-generate-key-pair-post",
          label: "Generate Key Pair",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-dh-vyos-pki-generate-dh-post",
          label: "Generate Dh",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-certificate-vyos-pki-generate-certificate-post",
          label: "Generate Certificate",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-openvpn-shared-secret-vyos-pki-generate-openvpn-shared-secret-post",
          label: "Generate Openvpn Shared Secret",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/generate-openssh-vyos-pki-generate-openssh-post",
          label: "Generate Openssh",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "tunnel",
      items: [
        {
          type: "doc",
          id: "api/get-tunnel-capabilities-vyos-tunnel-capabilities-get",
          label: "Get Tunnel Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-tunnel-config-vyos-tunnel-config-get",
          label: "Get Tunnel Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/tunnel-batch-configure-vyos-tunnel-batch-post",
          label: "Tunnel Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "vxlan",
      items: [
        {
          type: "doc",
          id: "api/get-vxlan-capabilities-vyos-vxlan-capabilities-get",
          label: "Get Vxlan Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-vxlan-config-vyos-vxlan-config-get",
          label: "Get Vxlan Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/vxlan-batch-configure-vyos-vxlan-batch-post",
          label: "Vxlan Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "nhrp",
      items: [
        {
          type: "doc",
          id: "api/get-nhrp-capabilities-vyos-nhrp-capabilities-get",
          label: "Get Nhrp Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-nhrp-config-vyos-nhrp-config-get",
          label: "Get Nhrp Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/nhrp-batch-configure-vyos-nhrp-batch-post",
          label: "Nhrp Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "pim",
      items: [
        {
          type: "doc",
          id: "api/get-pim-capabilities-vyos-pim-capabilities-get",
          label: "Get Pim Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-pim-config-vyos-pim-config-get",
          label: "Get Pim Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/pim-batch-configure-vyos-pim-batch-post",
          label: "Pim Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "pim6",
      items: [
        {
          type: "doc",
          id: "api/get-pim-6-capabilities-vyos-pim-6-capabilities-get",
          label: "Get Pim6 Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-pim-6-config-vyos-pim-6-config-get",
          label: "Get Pim6 Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/pim-6-batch-configure-vyos-pim-6-batch-post",
          label: "Pim6 Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "rip",
      items: [
        {
          type: "doc",
          id: "api/get-rip-capabilities-vyos-rip-capabilities-get",
          label: "Get Rip Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-rip-config-vyos-rip-config-get",
          label: "Get Rip Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/rip-batch-configure-vyos-rip-batch-post",
          label: "Rip Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ripng",
      items: [
        {
          type: "doc",
          id: "api/get-ripng-capabilities-vyos-ripng-capabilities-get",
          label: "Get Ripng Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ripng-config-vyos-ripng-config-get",
          label: "Get Ripng Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ripng-batch-configure-vyos-ripng-batch-post",
          label: "Ripng Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "rpki",
      items: [
        {
          type: "doc",
          id: "api/get-rpki-capabilities-vyos-rpki-capabilities-get",
          label: "Get Rpki Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-rpki-config-vyos-rpki-config-get",
          label: "Get Rpki Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/rpki-batch-configure-vyos-rpki-batch-post",
          label: "Rpki Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "traffic-engineering",
      items: [
        {
          type: "doc",
          id: "api/get-te-capabilities-vyos-traffic-engineering-capabilities-get",
          label: "Get Te Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-te-config-vyos-traffic-engineering-config-get",
          label: "Get Te Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/te-batch-configure-vyos-traffic-engineering-batch-post",
          label: "Te Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "broadcast-relay",
      items: [
        {
          type: "doc",
          id: "api/get-broadcast-relay-capabilities-vyos-broadcast-relay-capabilities-get",
          label: "Get Broadcast Relay Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-broadcast-relay-config-vyos-broadcast-relay-config-get",
          label: "Get Broadcast Relay Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/broadcast-relay-batch-configure-vyos-broadcast-relay-batch-post",
          label: "Broadcast Relay Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "lldp",
      items: [
        {
          type: "doc",
          id: "api/get-lldp-capabilities-vyos-lldp-capabilities-get",
          label: "Get Lldp Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-lldp-config-vyos-lldp-config-get",
          label: "Get Lldp Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/lldp-batch-configure-vyos-lldp-batch-post",
          label: "Lldp Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "bug-report",
      items: [
        {
          type: "doc",
          id: "api/status-vyos-bug-report-status-get",
          label: "Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/device-start-vyos-bug-report-github-device-start-post",
          label: "Device Start",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/device-poll-vyos-bug-report-github-device-poll-post",
          label: "Device Poll",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/preview-vyos-bug-report-preview-post",
          label: "Preview",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/submit-vyos-bug-report-submit-post",
          label: "Submit",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ndp-proxy",
      items: [
        {
          type: "doc",
          id: "api/get-ndp-proxy-capabilities-vyos-ndp-proxy-capabilities-get",
          label: "Get Ndp Proxy Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ndp-proxy-config-vyos-ndp-proxy-config-get",
          label: "Get Ndp Proxy Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ndp-proxy-batch-configure-vyos-ndp-proxy-batch-post",
          label: "Ndp Proxy Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ntp",
      items: [
        {
          type: "doc",
          id: "api/get-ntp-capabilities-vyos-ntp-capabilities-get",
          label: "Get Ntp Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ntp-config-vyos-ntp-config-get",
          label: "Get Ntp Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ntp-batch-configure-vyos-ntp-batch-post",
          label: "Ntp Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "snmp",
      items: [
        {
          type: "doc",
          id: "api/get-snmp-capabilities-vyos-snmp-capabilities-get",
          label: "Get Snmp Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-snmp-config-vyos-snmp-config-get",
          label: "Get Snmp Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/snmp-batch-configure-vyos-snmp-batch-post",
          label: "Snmp Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ssh",
      items: [
        {
          type: "doc",
          id: "api/get-ssh-capabilities-vyos-ssh-capabilities-get",
          label: "Get Ssh Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ssh-config-vyos-ssh-config-get",
          label: "Get Ssh Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ssh-batch-configure-vyos-ssh-batch-post",
          label: "Ssh Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "tftp-server",
      items: [
        {
          type: "doc",
          id: "api/get-tftp-server-capabilities-vyos-tftp-server-capabilities-get",
          label: "Get Tftp Server Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-tftp-server-config-vyos-tftp-server-config-get",
          label: "Get Tftp Server Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/tftp-server-batch-configure-vyos-tftp-server-batch-post",
          label: "Tftp Server Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "qos",
      items: [
        {
          type: "doc",
          id: "api/get-qos-capabilities-vyos-qos-capabilities-get",
          label: "Get Qos Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-qos-config-vyos-qos-config-get",
          label: "Get Qos Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/qos-batch-configure-vyos-qos-batch-post",
          label: "Qos Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "router-advert",
      items: [
        {
          type: "doc",
          id: "api/get-router-advert-capabilities-vyos-router-advert-capabilities-get",
          label: "Get Router Advert Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-router-advert-config-vyos-router-advert-config-get",
          label: "Get Router Advert Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/router-advert-batch-configure-vyos-router-advert-batch-post",
          label: "Router Advert Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "salt-minion",
      items: [
        {
          type: "doc",
          id: "api/get-salt-minion-capabilities-vyos-salt-minion-capabilities-get",
          label: "Get Salt Minion Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-salt-minion-config-vyos-salt-minion-config-get",
          label: "Get Salt Minion Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/salt-minion-batch-configure-vyos-salt-minion-batch-post",
          label: "Salt Minion Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "sla",
      items: [
        {
          type: "doc",
          id: "api/get-sla-capabilities-vyos-sla-capabilities-get",
          label: "Get Sla Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-sla-config-vyos-sla-config-get",
          label: "Get Sla Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/sla-batch-configure-vyos-sla-batch-post",
          label: "Sla Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "service-monitoring",
      items: [
        {
          type: "doc",
          id: "api/get-service-monitoring-capabilities-vyos-service-monitoring-capabilities-get",
          label: "Get Service Monitoring Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-service-monitoring-config-vyos-service-monitoring-config-get",
          label: "Get Service Monitoring Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/service-monitoring-batch-configure-vyos-service-monitoring-batch-post",
          label: "Service Monitoring Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "dhcp-relay",
      items: [
        {
          type: "doc",
          id: "api/get-dhcp-relay-capabilities-vyos-dhcp-relay-capabilities-get",
          label: "Get Dhcp Relay Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-dhcp-relay-config-vyos-dhcp-relay-config-get",
          label: "Get Dhcp Relay Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/dhcp-relay-batch-configure-vyos-dhcp-relay-batch-post",
          label: "Dhcp Relay Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "dhcpv6-relay",
      items: [
        {
          type: "doc",
          id: "api/get-dhcpv-6-relay-capabilities-vyos-dhcpv-6-relay-capabilities-get",
          label: "Get Dhcpv6 Relay Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-dhcpv-6-relay-config-vyos-dhcpv-6-relay-config-get",
          label: "Get Dhcpv6 Relay Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/dhcpv-6-relay-batch-configure-vyos-dhcpv-6-relay-batch-post",
          label: "Dhcpv6 Relay Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "dhcpv6-server",
      items: [
        {
          type: "doc",
          id: "api/get-dhcpv-6-server-capabilities-vyos-dhcpv-6-server-capabilities-get",
          label: "Get Dhcpv6 Server Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-dhcpv-6-server-config-vyos-dhcpv-6-server-config-get",
          label: "Get Dhcpv6 Server Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/dhcpv-6-server-batch-configure-vyos-dhcpv-6-server-batch-post",
          label: "Dhcpv6 Server Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "dns-forwarding",
      items: [
        {
          type: "doc",
          id: "api/get-dns-forwarding-capabilities-vyos-dns-forwarding-capabilities-get",
          label: "Get Dns Forwarding Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-dns-forwarding-config-vyos-dns-forwarding-config-get",
          label: "Get Dns Forwarding Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/dns-forwarding-batch-configure-vyos-dns-forwarding-batch-post",
          label: "Dns Forwarding Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "dns-dynamic",
      items: [
        {
          type: "doc",
          id: "api/get-dns-dynamic-capabilities-vyos-dns-dynamic-capabilities-get",
          label: "Get Dns Dynamic Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-dns-dynamic-config-vyos-dns-dynamic-config-get",
          label: "Get Dns Dynamic Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/dns-dynamic-batch-configure-vyos-dns-dynamic-batch-post",
          label: "Dns Dynamic Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "webproxy",
      items: [
        {
          type: "doc",
          id: "api/get-webproxy-capabilities-vyos-webproxy-capabilities-get",
          label: "Get Webproxy Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-webproxy-config-vyos-webproxy-config-get",
          label: "Get Webproxy Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/webproxy-batch-configure-vyos-webproxy-batch-post",
          label: "Webproxy Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "event-handler",
      items: [
        {
          type: "doc",
          id: "api/get-event-handler-capabilities-vyos-event-handler-capabilities-get",
          label: "Get Event Handler Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-event-handler-config-vyos-event-handler-config-get",
          label: "Get Event Handler Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/event-handler-batch-configure-vyos-event-handler-batch-post",
          label: "Event Handler Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "https",
      items: [
        {
          type: "doc",
          id: "api/get-https-capabilities-vyos-https-capabilities-get",
          label: "Get Https Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-https-config-vyos-https-config-get",
          label: "Get Https Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/https-batch-configure-vyos-https-batch-post",
          label: "Https Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "ipoe-server",
      items: [
        {
          type: "doc",
          id: "api/get-ipoe-capabilities-vyos-ipoe-server-capabilities-get",
          label: "Get Ipoe Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-ipoe-config-vyos-ipoe-server-config-get",
          label: "Get Ipoe Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/ipoe-batch-configure-vyos-ipoe-server-batch-post",
          label: "Ipoe Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "pppoe-server",
      items: [
        {
          type: "doc",
          id: "api/get-pppoe-capabilities-vyos-pppoe-server-capabilities-get",
          label: "Get Pppoe Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-pppoe-config-vyos-pppoe-server-config-get",
          label: "Get Pppoe Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/pppoe-batch-configure-vyos-pppoe-server-batch-post",
          label: "Pppoe Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "config-sync",
      items: [
        {
          type: "doc",
          id: "api/get-config-sync-capabilities-vyos-config-sync-capabilities-get",
          label: "Get Config Sync Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-config-sync-config-vyos-config-sync-config-get",
          label: "Get Config Sync Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/config-sync-batch-configure-vyos-config-sync-batch-post",
          label: "Config Sync Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "conntrack-sync",
      items: [
        {
          type: "doc",
          id: "api/get-conntrack-sync-capabilities-vyos-conntrack-sync-capabilities-get",
          label: "Get Conntrack Sync Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-conntrack-sync-config-vyos-conntrack-sync-config-get",
          label: "Get Conntrack Sync Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/conntrack-sync-batch-configure-vyos-conntrack-sync-batch-post",
          label: "Conntrack Sync Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "console-server",
      items: [
        {
          type: "doc",
          id: "api/get-console-server-capabilities-vyos-console-server-capabilities-get",
          label: "Get Console Server Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-console-server-config-vyos-console-server-config-get",
          label: "Get Console Server Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/console-server-batch-configure-vyos-console-server-batch-post",
          label: "Console Server Batch Configure",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "container",
      items: [
        {
          type: "doc",
          id: "api/get-container-capabilities-vyos-container-capabilities-get",
          label: "Get Container Capabilities",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-container-config-vyos-container-config-get",
          label: "Get Container Config",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/container-batch-configure-vyos-container-batch-post",
          label: "Container Batch Configure",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/container-image-pull-vyos-container-image-pull-post",
          label: "Container Image Pull",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/container-image-update-ref-vyos-container-image-update-ref-post",
          label: "Container Image Update Ref",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/container-image-delete-ref-vyos-container-image-delete-ref-post",
          label: "Container Image Delete Ref",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/container-image-add-vyos-container-image-add-post",
          label: "Container Image Add",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/container-image-delete-vyos-container-image-delete-post",
          label: "Container Image Delete",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/container-image-update-vyos-container-image-update-post",
          label: "Container Image Update",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/container-restart-vyos-container-restart-post",
          label: "Container Restart",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-container-images-vyos-container-images-get",
          label: "Get Container Images",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-container-log-vyos-container-log-post",
          label: "Get Container Log",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/check-base-dir-vyos-container-base-dir-get",
          label: "Check Base Dir",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-base-dir-vyos-container-base-dir-post",
          label: "Create Base Dir",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/create-container-dirs-vyos-container-mkdir-post",
          label: "Create Container Dirs",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/touch-container-files-vyos-container-touch-post",
          label: "Touch Container Files",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/read-container-file-vyos-container-file-get",
          label: "Read Container File",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/write-container-file-vyos-container-file-post",
          label: "Write Container File",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/remove-container-dir-vyos-container-rmdir-post",
          label: "Remove Container Dir",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "console",
      items: [
        {
          type: "doc",
          id: "api/get-console-status-vyos-console-status-get",
          label: "Get Console Status",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "version",
      items: [
        {
          type: "doc",
          id: "api/check-version-vyos-version-check-get",
          label: "Check Version",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "events",
      items: [
        {
          type: "doc",
          id: "api/banner-events-vyos-events-banners-get",
          label: "Banner Events",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "root",
      items: [
        {
          type: "doc",
          id: "api/read-root-get",
          label: "Read Root",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
