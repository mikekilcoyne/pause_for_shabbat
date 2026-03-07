# SHABBAT MODE

## Product Spec + Build Framework (v1)

### Core Idea

Shabbat Mode is a lightweight tool that automatically enables an
out-of-office style auto-responder every week during Shabbat (Friday
sunset → Saturday night).

The message encourages senders to pause and reconnect on Sunday,
reinforcing rest, reflection, and intentional time offline.

The system automatically activates based on: - User timezone - Local
sunset times - User calendar integration

Inspired by Rabbi Josh Franklin and the themes of *Where Are You?*

------------------------------------------------------------------------

# 1. Core Product Goals

### Simplicity

Setup should take under 60 seconds.

Primary setup paths:

1.  Email Setup\
    Send an email to:

set@shabbatmode.com

Include: - Name - Timezone - Email account to activate - Optional custom
message

2.  Minimal Web Setup\
    A simple form with 4 fields.

No dashboards.\
No complex settings.

------------------------------------------------------------------------

# 2. Primary Features

## Weekly Auto Activation

Every week:

Friday → activate at local sunset\
Saturday → deactivate at nightfall

Sunset data pulled automatically via API.

Example APIs: - sunrise-sunset.org - NOAA - SunCalc library

------------------------------------------------------------------------

## Auto Response Example

Subject: Shabbat Mode Enabled

Body:

Hi ---

I observe Shabbat from Friday evening through Saturday evening.

During this time I step away from email and digital communication.

If this is important, please resend your message on Sunday and I'll
respond then.

Wishing you a peaceful weekend.

--- \[Name\]

Optional link: Learn about Shabbat Mode

------------------------------------------------------------------------

# 3. Integrations (Phase 1)

### Email Providers

Must support:

-   Gmail (Google Workspace API)
-   Outlook (Microsoft Graph API)

Capabilities:

-   Enable auto responder
-   Disable auto responder
-   Set recurring schedule

------------------------------------------------------------------------

### Calendar Integration

Optional but recommended.

Supported:

-   Google Calendar
-   Outlook Calendar

Purpose:

-   Detect timezone
-   Detect travel
-   Adjust Shabbat timing automatically

Example:

User travels from NYC → London.

System automatically adjusts Shabbat timing.

------------------------------------------------------------------------

# 4. Setup Methods

## Method A --- Email Setup (Preferred)

User sends email to:

set@shabbatmode.com

Example email body:

Name: Michael\
Timezone: America/New_York\
Email: michael@email.com\
Custom Message: optional

System response:

Shabbat Mode is now active.

It will automatically activate every Friday at sunset and deactivate
Saturday evening.

You can disable anytime by emailing:

stop@shabbatmode.com

------------------------------------------------------------------------

## Method B --- Web Setup

Minimal webpage:

shabbatmode.com

Single form.

Fields:

Name\
Email\
Timezone (auto detected)\
Customize message (optional)

Button:

Enable Shabbat Mode

------------------------------------------------------------------------

# 5. Minimal UI

Design principles:

-   Calm
-   Distraction free
-   Sabbath aesthetic
-   No dashboards

### Landing Page

Hero:

Turn off email.\
Turn on Shabbat.

Subtext:

Automatically pause your inbox every week.

Button:

Enable Shabbat Mode

------------------------------------------------------------------------

### Confirmation Screen

Shabbat Mode Activated

Displays:

Next activation time\
Example message preview

------------------------------------------------------------------------

# 6. Backend Logic

Core flow:

User signs up\
↓\
System stores email, timezone, message\
↓\
Scheduler runs weekly\
↓\
Calculate sunset\
↓\
Enable autoresponder\
↓\
Disable Saturday night

------------------------------------------------------------------------

# 7. Data Model

User

id\
name\
email\
timezone\
custom_message\
provider (gmail/outlook)\
active (boolean)\
created_at

Schedule

user_id\
sunset_time\
nightfall_time\
last_triggered

------------------------------------------------------------------------

# 8. Architecture

Frontend

Simple landing page\
Minimal form\
Confirmation page

Backend

Node / serverless functions\
Cron scheduler\
Sunset calculation\
Email API integrations

Possible stack:

Frontend: SvelteKit / NextJS\
Backend: Node serverless functions\
Database: Supabase / Postgres\
Scheduler: Cron worker

------------------------------------------------------------------------

# 9. Future Features (Phase 2)

### Rabbi Directory

Allow Rabbis to share:

Shabbat Mode Setup Link

Example:

shabbatmode.com/rabbi/franklin

Members click and instantly enable.

------------------------------------------------------------------------

### Community Mode

Congregations can activate together.

Example:

Temple community observing Shabbat Mode together.

------------------------------------------------------------------------

### SMS Mode

Instead of email auto responder.

User gets:

Shabbat Mode active

Anyone texting receives:

Michael is offline for Shabbat. Please try again Sunday.

------------------------------------------------------------------------

# 10. Product Philosophy

This is not a productivity tool.

This is an anti-productivity tool.

Purpose:

-   Encourage rest
-   Reduce digital overwhelm
-   Reintroduce sacred time

Simple rule:

Once enabled, Shabbat Mode runs quietly forever.

No notifications.\
No gamification.

Just silence.

------------------------------------------------------------------------

# 11. MVP Build Order

Step 1 Simple landing page + email signup + database

Step 2 Gmail autoresponder integration

Step 3 Sunset scheduler

Step 4 Outlook integration

Step 5 Email-based setup workflow

------------------------------------------------------------------------

# End Spec
