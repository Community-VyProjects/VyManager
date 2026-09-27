// English is the source of truth: one JSON file per namespace, registered here
// (keep alphabetical). Other locales use the same file names under
// messages/<locale>/; a missing file or key falls back to English.
import accessList from "./accessList.json";
import admin from "./admin.json";
import appsCatalog from "./appsCatalog.json";
import authentication from "./authentication.json";
import babel from "./babel.json";
import backupBugReport from "./backupBugReport.json";
import bfd from "./bfd.json";
import bgp from "./bgp.json";
import bgpLists from "./bgpLists.json";
import bonding from "./bonding.json";
import bridgeInterface from "./bridgeInterface.json";
import broadcastRelay from "./broadcastRelay.json";
import common from "./common.json";
import configChanges from "./configChanges.json";
import configSync from "./configSync.json";
import conntrackSync from "./conntrackSync.json";
import console from "./console.json";
import consoleServer from "./consoleServer.json";
import containerResources from "./containerResources.json";
import containers from "./containers.json";
import dashboard from "./dashboard.json";
import dhcpRelay from "./dhcpRelay.json";
import dhcpServer from "./dhcpServer.json";
import dhcpv6Relay from "./dhcpv6Relay.json";
import dhcpv6Server from "./dhcpv6Server.json";
import dnsDynamic from "./dnsDynamic.json";
import dnsForwarding from "./dnsForwarding.json";
import dummy from "./dummy.json";
import ethernet from "./ethernet.json";
import eventHandler from "./eventHandler.json";
import failover from "./failover.json";
import firewallBridge from "./firewallBridge.json";
import firewallCommon from "./firewallCommon.json";
import firewallFlowtables from "./firewallFlowtables.json";
import firewallGlobalOptions from "./firewallGlobalOptions.json";
import firewallGroups from "./firewallGroups.json";
import firewallPolicies from "./firewallPolicies.json";
import firewallRuleModal from "./firewallRuleModal.json";
import firewallValidation from "./firewallValidation.json";
import firewallZones from "./firewallZones.json";
import geneve from "./geneve.json";
import haproxy from "./haproxy.json";
import highAvailability from "./highAvailability.json";
import https from "./https.json";
import igmpProxy from "./igmpProxy.json";
import input from "./input.json";
import interfaces from "./interfaces.json";
import ipoeServer from "./ipoeServer.json";
import ipsec from "./ipsec.json";
import ipsecSettings from "./ipsecSettings.json";
import isis from "./isis.json";
import l2tp from "./l2tp.json";
import l2tpv3 from "./l2tpv3.json";
import language from "./language.json";
import lldp from "./lldp.json";
import localRoute from "./localRoute.json";
import login from "./login.json";
import loopback from "./loopback.json";
import macsec from "./macsec.json";
import miscLib from "./miscLib.json";
import monitoring from "./monitoring.json";
import mpls from "./mpls.json";
import nat from "./nat.json";
import nat64 from "./nat64.json";
import nat66 from "./nat66.json";
import navigation from "./navigation.json";
import ndpProxy from "./ndpProxy.json";
import nhrp from "./nhrp.json";
import ntp from "./ntp.json";
import onboarding from "./onboarding.json";
import openfabric from "./openfabric.json";
import openvpn from "./openvpn.json";
import openvpnTools from "./openvpnTools.json";
import ospf from "./ospf.json";
import ospfv3 from "./ospfv3.json";
import pim from "./pim.json";
import pim6 from "./pim6.json";
import pki from "./pki.json";
import pkiCerts from "./pkiCerts.json";
import power from "./power.json";
import pppoe from "./pppoe.json";
import pppoeServer from "./pppoeServer.json";
import pppoeServerSettings from "./pppoeServerSettings.json";
import prefixList from "./prefixList.json";
import pseudoEthernet from "./pseudoEthernet.json";
import qos from "./qos.json";
import rip from "./rip.json";
import ripng from "./ripng.json";
import routeMap from "./routeMap.json";
import routeMapRuleModal from "./routeMapRuleModal.json";
import routePolicy from "./routePolicy.json";
import routeRuleModal from "./routeRuleModal.json";
import routerAdvert from "./routerAdvert.json";
import routingExtras from "./routingExtras.json";
import routingPages from "./routingPages.json";
import rpki from "./rpki.json";
import saltMinion from "./saltMinion.json";
import search from "./search.json";
import searchIndex from "./searchIndex.json";
import serviceMonitoring from "./serviceMonitoring.json";
import settings from "./settings.json";
import sharedMisc from "./sharedMisc.json";
import sharedUi from "./sharedUi.json";
import sidebar from "./sidebar.json";
import sites from "./sites.json";
import sla from "./sla.json";
import snmp from "./snmp.json";
import ssh from "./ssh.json";
import sstpc from "./sstpc.json";
import staticRoutes from "./staticRoutes.json";
import systemAdvanced from "./systemAdvanced.json";
import systemConntrack from "./systemConntrack.json";
import systemFlowArchive from "./systemFlowArchive.json";
import systemGeneral from "./systemGeneral.json";
import systemLogin from "./systemLogin.json";
import systemSyslog from "./systemSyslog.json";
import tftpServer from "./tftpServer.json";
import trafficEngineering from "./trafficEngineering.json";
import tunnel from "./tunnel.json";
import twoFactor from "./twoFactor.json";
import userManagement from "./userManagement.json";
import virtualEthernet from "./virtualEthernet.json";
import vlan from "./vlan.json";
import vpp from "./vpp.json";
import vrf from "./vrf.json";
import vrfProtocols from "./vrfProtocols.json";
import vti from "./vti.json";
import vxlan from "./vxlan.json";
import wanLoadBalancing from "./wanLoadBalancing.json";
import webproxy from "./webproxy.json";
import wireguard from "./wireguard.json";
import wireguardTools from "./wireguardTools.json";
import wireless from "./wireless.json";
import wwan from "./wwan.json";

const messages = {
  accessList,
  admin,
  appsCatalog,
  authentication,
  babel,
  backupBugReport,
  bfd,
  bgp,
  bgpLists,
  bonding,
  bridgeInterface,
  broadcastRelay,
  common,
  configChanges,
  configSync,
  conntrackSync,
  console,
  consoleServer,
  containerResources,
  containers,
  dashboard,
  dhcpRelay,
  dhcpServer,
  dhcpv6Relay,
  dhcpv6Server,
  dnsDynamic,
  dnsForwarding,
  dummy,
  ethernet,
  eventHandler,
  failover,
  firewallBridge,
  firewallCommon,
  firewallFlowtables,
  firewallGlobalOptions,
  firewallGroups,
  firewallPolicies,
  firewallRuleModal,
  firewallValidation,
  firewallZones,
  geneve,
  haproxy,
  highAvailability,
  https,
  igmpProxy,
  input,
  interfaces,
  ipoeServer,
  ipsec,
  ipsecSettings,
  isis,
  l2tp,
  l2tpv3,
  language,
  lldp,
  localRoute,
  login,
  loopback,
  macsec,
  miscLib,
  monitoring,
  mpls,
  nat,
  nat64,
  nat66,
  navigation,
  ndpProxy,
  nhrp,
  ntp,
  onboarding,
  openfabric,
  openvpn,
  openvpnTools,
  ospf,
  ospfv3,
  pim,
  pim6,
  pki,
  pkiCerts,
  power,
  pppoe,
  pppoeServer,
  pppoeServerSettings,
  prefixList,
  pseudoEthernet,
  qos,
  rip,
  ripng,
  routeMap,
  routeMapRuleModal,
  routePolicy,
  routeRuleModal,
  routerAdvert,
  routingExtras,
  routingPages,
  rpki,
  saltMinion,
  search,
  searchIndex,
  serviceMonitoring,
  settings,
  sharedMisc,
  sharedUi,
  sidebar,
  sites,
  sla,
  snmp,
  ssh,
  sstpc,
  staticRoutes,
  systemAdvanced,
  systemConntrack,
  systemFlowArchive,
  systemGeneral,
  systemLogin,
  systemSyslog,
  tftpServer,
  trafficEngineering,
  tunnel,
  twoFactor,
  userManagement,
  virtualEthernet,
  vlan,
  vpp,
  vrf,
  vrfProtocols,
  vti,
  vxlan,
  wanLoadBalancing,
  webproxy,
  wireguard,
  wireguardTools,
  wireless,
  wwan,
};

export default messages;
