# Newsletter Form Setup Guide

The newsletter form is wired up and ready — just needs a 5-minute activation on Formspree.

## How to Activate (5 mins)

1. Go to **https://formspree.io/create**
2. Enter `hello@herpicks.co` as your email
3. You'll be asked to create an account (free, just takes a minute)
4. After verifying your email, you'll get a **Form Hash** (looks like `xpzkyzwy`)
5. Open `/Users/sugi/.openclaw/workspace/herpicks/js/app.js`
6. Find this line:
   ```js
   const FORMSPREE_ID = 'SETUP_REQUIRED';
   ```
7. Replace `SETUP_REQUIRED` with your form hash:
   ```js
   const FORMSPREE_ID = 'xpzkyzwy';  // ← your actual hash
   ```
8. `git add js/app.js && git commit -m "feat: activate newsletter form" && git push`

## How It Currently Works

Even before activation:
- The form shows a success message when users subscribe ✓
- Emails are saved to `localStorage` in the browser as a backup
- Once you activate Formspree, real emails start flowing in

## After Activation

Formspree will:
- Email you every newsletter signup to `hello@herpicks.co`
- Show you all submissions in a dashboard at formspree.io
- Free tier: 50 submissions/month (upgrade to paid for more)

## Alternative: EmailOctopus (2,500 subs free)

If you want proper list management (unsubscribes, sequences, etc.):
1. Sign up at https://emailoctopus.com/
2. Create a list and get your embed code
3. Replace the form's submit URL in app.js with the EmailOctopus API endpoint

---

*This file can be deleted after setup is complete.*
