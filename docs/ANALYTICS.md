# Analytics Setup

Bright Line Photography supports both **Plausible** (privacy-friendly) and **Google Analytics 4** for tracking.

## Environment Variables

Add one or both to your `.env`:

```bash
# Plausible (recommended - privacy-friendly)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=brightlinephotography.co

# Google Analytics 4
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## How It Works

The `Analytics` component in `components/Analytics.tsx` automatically loads the appropriate scripts based on which env vars are set.

### Plausible
- Privacy-friendly (no cookies)
- Simple dashboard
- Free for small sites, paid for more features
- Set up at [plausible.io](https://plausible.io)

### Google Analytics 4
- Full-featured analytics
- Requires cookie consent in EU
- Free with Google account
- Set up at [analytics.google.com](https://analytics.google.com)

## Event Tracking

Custom events are tracked using the utilities in `lib/analytics.ts`:

### Available Events

| Event | Description | Properties |
|-------|-------------|------------|
| `cta_click` | CTA button clicked | `label`, `location`, `service` |
| `booking_click` | Booking button clicked | `location` |
| `contact_submit` | Contact form submitted | `type`, `service` |
| `portfolio_view` | Portfolio project viewed | `slug`, `category`, `title` |
| `service_view` | Service page viewed | `slug`, `title` |
| `gallery_access` | Client gallery accessed | `gallery_id` |
| `download` | File downloaded | `type`, `gallery_id` |
| `favorite` | Image favorited/unfavorited | `action`, `gallery_id` |

### Usage in Components

```tsx
import { trackCTAClick, trackContactSubmit } from "@/lib/analytics";

// Track CTA click
trackCTAClick({ 
  label: "Request a quote", 
  location: "services-page", 
  service: "hospitality" 
});

// Track form submission
trackContactSubmit({ 
  type: "inquiry", 
  service: "commercial-real-estate" 
});
```

## Viewing Analytics

### Plausible
Visit your Plausible dashboard at `https://plausible.io/brightlinephotography.co`

### Google Analytics
1. Go to [analytics.google.com](https://analytics.google.com)
2. Select your property
3. View Realtime for live testing
4. Check Reports > Engagement > Events for custom events

## Testing

In development mode, all events are logged to the browser console:
```
[Analytics] cta_click { label: "Request a quote", location: "homepage", service: "general" }
```

## Privacy Considerations

- Plausible does not use cookies and is GDPR-compliant by default
- If using Google Analytics, you may need to implement cookie consent
- Client portal pages are not tracked (noindex, no analytics events)
