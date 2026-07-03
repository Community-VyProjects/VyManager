---
id: policies
title: Policies
sidebar_position: 5
---

# Policies

Routing policy objects: access lists, prefix lists, route maps, policy-based routing, local routes, and the four BGP list types. Every page uses the same master-detail layout — a sidebar of lists with search and create/delete, a rule table for the selected list, and dialogs for adding, editing and deleting rules. Rules reorder by drag and drop with a save/cancel banner; saving applies as one commit.

- **Access Lists** — IPv4 lists by number (standard/extended ranges shown from the router's capabilities) and IPv6 lists by name. Rules match source, and for IPv4 also destination, with permit/deny actions.
- **Prefix Lists** — IPv4 and IPv6 lists; rules carry prefix, ge/le bounds and action.
- **Route Maps** — rules with match conditions and set actions.
- **Route (PBR)** — policy-based routing for IPv4 (`route`) and IPv6 (`route6`). Rules combine match conditions with set actions and can be disabled individually. Each policy has an "Applied Interfaces" card with a dialog to attach or detach interfaces, including VLAN sub-interfaces.
- **Local Route** — flat rule tables (IPv4/IPv6) directing traffic by source/destination/interface into routing tables or VRFs.
- **BGP AS Path / Community / Extended Community / Large Community** — regex-based BGP filter lists with permit/deny rules. The extended-community page classifies each pattern (route target, site of origin, plain regex) with a badge.
