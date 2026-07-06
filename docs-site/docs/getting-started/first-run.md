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

This step is optional. If you do not have a router ready, click **Skip for now** below the form — your admin account and site are still created, and you can add a router later in Site Manager. See [Finishing without a router](#finishing-without-a-router).

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

## Finishing without a router

Clicking **Skip for now** on step 3 completes onboarding without an instance: the admin account and the site are created and you are signed in, exactly as with a full run — only the instance is skipped. You land on the Sites page.

While no instance exists anywhere you can see, the dashboard (`/`) shows a **Connect your first VyOS instance** panel with a shortcut to Site Manager instead of dashboard cards. All administration pages — Site Manager, user management, API tokens, backup and restore — work normally without a router. Feature pages that manage router configuration stay unavailable until you connect to an instance.

Once at least one instance exists but you are not connected to it, the dashboard goes back to redirecting you to the Sites page so you can connect.

## After onboarding

Registration is closed once the first user exists: sign-up requests return `403 Registration is closed`. Additional users are created by administrators in the settings area. Login attempts are rate-limited to 10 per minute per client IP.

From the Sites page, click Connect on the instance card. VyManager tests the connection, verifies the API key and takes you to the dashboard.
