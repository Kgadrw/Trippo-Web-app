# PWA Setup for Tracka

Your Tracka application is now configured as a Progressive Web App (PWA) that can be installed on devices.

## What's Already Configured

✅ **Manifest.json** - Updated with Tracka branding and proper PWA configuration
✅ **Service Worker** - Configured for offline support and caching
✅ **HTML Meta Tags** - Updated with PWA-specific meta tags
✅ **Browser Config** - Added for Windows tile support

## Required: Create PWA Icons

To complete the PWA setup, you need to create two icon files:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

### Icon Design
Create a square icon with a blue background (#1e40af) and a white "T" letter in the center (matching your logo design).

### Creating Icons

You can use any image editor or online tool:
- **Online**: https://www.favicon-generator.org/ or https://realfavicongenerator.net/
- **Design tools**: Figma, Canva, Photoshop, GIMP

### Steps:
1. Create a square icon design (blue background with white "T")
2. Export as PNG at 192x192 and 512x512 pixels
3. Save them in the `public` folder as:
   - `public/icon-192.png`
   - `public/icon-512.png`

### Quick Command (if you have ImageMagick):
```bash
# Convert favicon.ico to PNG icons (if favicon exists)
# Note: You'll need to manually create proper icons for best results
```

## Testing the PWA

### Development Mode
Service workers are disabled in development for easier testing.

### Production Build
1. Build the app: `npm run build`
2. Preview: `npm run preview`
3. Test on HTTPS (required for PWA):
   - Use a service like ngrok for local testing: `ngrok http 4173`
   - Or deploy to a hosting service with HTTPS

### Install Testing

#### Desktop (Chrome/Edge):
1. Open the app in browser
2. Look for install icon in address bar
3. Click to install

#### Mobile (Android Chrome):
1. Open the app in browser
2. Tap menu (three dots)
3. Select "Add to Home Screen" or "Install App"

#### iOS Safari:
1. Open the app in Safari
2. Tap Share button
3. Select "Add to Home Screen"

## Deployment Requirements

For PWA to work properly:
- ✅ HTTPS is required (except localhost)
- ✅ Valid manifest.json
- ✅ Service worker registered
- ✅ Icons in correct sizes

## Current Configuration

- **App Name**: Tracka
- **Theme Color**: #1e40af (Blue-700)
- **Display Mode**: Standalone (runs like a native app)
- **Orientation**: Any
- **Shortcuts**: Dashboard, Products, Sales

## Next Steps (Optional Enhancements)

1. Create and add icon files (icon-192.png, icon-512.png)
2. Add screenshots to manifest.json for better app store listings
3. Implement install prompt component for better UX
4. Add offline fallback page
5. Configure push notifications (if needed)

Your PWA is ready once you add the icon files!
