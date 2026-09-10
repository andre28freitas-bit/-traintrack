# TrainTrack

TrainTrack is a mobile-friendly PWA for personal trainers to manage students, physical assessments, workouts, scheduling and visual progress.

## Current production stack
- Cloudflare Pages
- GitHub
- Supabase Auth, PostgreSQL and Storage
- TrainTrack data is isolated in `traintrack_*` tables and the private `traintrack-media` bucket.

## Current features
- Student profiles and contact details
- Optional student profile photo by upload or camera
- Physical assessments with editable raw test results
- Weight and body measurements per assessment
- Assessment photos by upload or camera
- Edit and delete assessments with confirmation
- Visual progression with line charts for tests and body measurements
- Report / PDF print view with charts, comparison against the previous assessment and assessment photos
- Overall/category score UI prepared but intentionally left blank until real scoring formulas are supplied
- Workouts
- Reassessment reminders
- Weekly calendar
- Recurring appointments: weekly, fortnightly or monthly
- Universal `.ics` export for the PT calendar and sharing with the student

## Production URL
https://traintrack-c18.pages.dev

## Security
The browser only receives the Supabase publishable key. Row Level Security isolates each authenticated PT's rows. Never place a `service_role` key in frontend code.

Integrated frontend version: v2.
