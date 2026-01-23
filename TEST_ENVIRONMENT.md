# VyManager Test Environment

## VyOS Test Instance

- **Version:** VyOS 1.4.4
- **IP Address:** 10.10.110.28
- **SSH Login:** vyos
- **SSH Password:** vyos
- **API Key:** 25eed1b63a59096472d4e6d82e65e6c802d85c2f1fef52c176325b750b0d5b59

## Current VyOS Configuration

- eth0: 10.10.110.28/24 (management)
- eth1: available for testing
- Default gateway: 10.10.110.1

## Test Scenarios

### Interface Types to Test

- [x] Ethernet interfaces
- [ ] Bonding (LACP, active-backup)
- [ ] Bridge (with STP)
- [ ] Tunnel (GRE, IPIP)
- [ ] VLAN sub-interfaces

### Routing Protocols to Test

- [ ] BGP
- [ ] OSPF

### VPN to Test

- [ ] IPsec
- [ ] OpenVPN
- [ ] WireGuard

## Notes

- Created: 2026-01-22
- API configured and verified working
