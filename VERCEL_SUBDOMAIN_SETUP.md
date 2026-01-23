# Vercel Subdomain Setup Guide for dashboard.trippo.rw

## Step 1: Add CNAME Record in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Add your main domain `trippo.rw` if not already added
4. Click **Add** to add a new domain
5. Enter `dashboard.trippo.rw`
6. Vercel will provide you with DNS records

## Step 2: Configure DNS Records

### Option A: Using Vercel's DNS (Recommended)

If you're using Vercel's nameservers:
- Vercel will automatically handle the CNAME for `dashboard.trippo.rw`
- No manual DNS configuration needed

### Option B: Using External DNS Provider

If you're using an external DNS provider (like Cloudflare, Namecheap, etc.):

1. Go to your DNS provider's dashboard
2. Add a **CNAME** record with the following:
   - **Name/Host**: `dashboard`
   - **Value/Target**: `cname.vercel-dns.com` (or the CNAME target Vercel provides)
   - **TTL**: `60` (or Auto)
   - **Priority**: Leave empty (not needed for CNAME)

**Example DNS Record:**
```
Type: CNAME
Name: dashboard
Value: cname.vercel-dns.com
TTL: 60
```

## Step 3: Verify Domain in Vercel

1. After adding the domain, Vercel will verify it
2. Wait for DNS propagation (can take a few minutes to 48 hours)
3. Check domain status in Vercel dashboard - it should show "Valid Configuration"

## Step 4: Configure Vercel Project Settings

1. In your Vercel project, go to **Settings** → **Domains**
2. Make sure both domains are added:
   - `trippo.rw` (main domain)
   - `dashboard.trippo.rw` (subdomain)
3. Both should point to the same deployment

## Step 5: Update Vercel Configuration (Optional)

The code changes already handle subdomain routing. However, you may want to add redirects in `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "redirects": [
    {
      "source": "/dashboard",
      "destination": "https://dashboard.trippo.rw/",
      "permanent": true,
      "has": [
        {
          "type": "host",
          "value": "trippo.rw"
        }
      ]
    },
    {
      "source": "/dashboard",
      "destination": "https://dashboard.trippo.rw/",
      "permanent": true,
      "has": [
        {
          "type": "host",
          "value": "www.trippo.rw"
        }
      ]
    }
  ]
}
```

## How It Works

1. **Main Domain (trippo.rw)**:
   - Shows the home page at `/`
   - Redirects `/dashboard` to `dashboard.trippo.rw`

2. **Dashboard Subdomain (dashboard.trippo.rw)**:
   - Shows the dashboard at `/` (root)
   - All dashboard routes work normally (`/products`, `/sales`, etc.)

3. **After Login**:
   - Users are automatically redirected to `dashboard.trippo.rw`
   - The code detects the subdomain and routes accordingly

## Testing

1. Visit `https://trippo.rw` - should show home page
2. Visit `https://dashboard.trippo.rw` - should show dashboard (if logged in) or redirect to home
3. After login from `trippo.rw`, should redirect to `dashboard.trippo.rw`

## Troubleshooting

### Issue: "Empty page" on dashboard.trippo.rw

**Solution**: 
- Check that the domain is properly configured in Vercel
- Verify DNS records are correct
- Wait for DNS propagation (can take up to 48 hours)
- Clear browser cache and try again

### Issue: CNAME not working

**Solution**:
- Ensure CNAME record is correct (no trailing dot)
- Check TTL is set correctly (60 seconds recommended)
- Verify domain is added in Vercel dashboard
- Wait for DNS propagation

### Issue: Redirects not working

**Solution**:
- Check browser console for errors
- Verify the code changes are deployed
- Ensure both domains are added in Vercel

## DNS Record Configuration Summary

```
Type: CNAME
Name: dashboard
Value: cname.vercel-dns.com (or value provided by Vercel)
TTL: 60
Priority: (leave empty)
```

**Note**: The exact CNAME value will be provided by Vercel when you add the domain. It may be something like:
- `cname.vercel-dns.com`
- Or a custom CNAME target specific to your Vercel account
