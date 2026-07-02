---
id: first-run
title: First run
sidebar_position: 6
---

# First run

On first visit, VyManager detects that no users exist and redirects you to the onboarding wizard at `/onboarding`. The check is the backend's `/session/onboarding-status` endpoint, which reports `needs_onboarding: true` as long as the `users` table is empty.

The wizard has three steps. Nothing is written until you submit the last step, so you can go back and correct entries.

## Step 1: admin account

Name, email and password for the first user. This account is created with the ADMIN role.

## Step 2: first site

Name and optional description for your first site, for example "Headquarters". Sites group VyOS instances; you can add more later in Site Manager.

## Step 3: first VyOS instance

The router VyManager connects to:

| Field | Notes |
|---|---|
| Name | Display name, required |
| Description | Optional |
| Host | IP address or hostname, required |
| Port | HTTPS port of the VyOS API, default 443 |
| API key | The key you configured on the router, required |
| VyOS version | 1.4 or 1.5 — selects the version-aware command set |
| Protocol | HTTPS (default) or HTTP |
| Verify SSL | Off by default. Enable only if the router presents a certificate the backend trusts |

Submitting this step creates the admin account, signs you in, creates the site and the instance, then redirects you to the Sites page. Before writing anything, the wizard re-checks the onboarding status; if someone else completed onboarding while your form was open, it aborts and sends you to the login page.

## After onboarding

Registration is closed once the first user exists: sign-up requests return `403 Registration is closed`. Additional users are created by administrators in the settings area. Login attempts are rate-limited to 10 per minute per client IP.

From the Sites page, click Connect on the instance card. VyManager tests the connection, verifies the API key and takes you to the dashboard.
