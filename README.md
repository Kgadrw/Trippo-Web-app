# Trippo - Stock & Profit Management Platform

## Overview

Trippo is a comprehensive business management system for tracking products, sales, inventory, and profits. Built with modern web technologies and designed to work offline with automatic sync capabilities.

## How to Get Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

Follow these steps:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd profit-pilot

# Step 3: Install the necessary dependencies
npm i

# Step 4: Start the development server with auto-reloading and an instant preview
npm run dev
```

The application will be available at `http://localhost:8080`

### Building for Production

```sh
# Build the production bundle
npm run build

# Preview the production build
npm run preview
```

## Features

- **Product Management**: Add, edit, and manage your product inventory
- **Sales Tracking**: Record sales and track revenue and profits
- **Reports & Analytics**: View detailed reports and sales trends
- **Offline Support**: Work offline with automatic sync when connection is restored
- **PWA Ready**: Install as a Progressive Web App (PWA)
- **Multi-language Support**: English, French, and Kinyarwanda
- **User Isolation**: Each user has their own isolated data and dashboard
- **Admin Dashboard**: Comprehensive admin panel for system monitoring and user management

## Technologies Used

This project is built with:

- **Vite** - Next-generation frontend tooling
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn-ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **IndexedDB** - Offline data storage
- **Service Workers** - PWA and offline functionality
- **Express.js** - Backend framework
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling

## Project Structure

```
src/
├── components/     # Reusable React components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and services
├── contexts/      # React contexts
└── App.tsx        # Main app component

backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── config/         # Configuration files
│   └── utils/          # Utility functions
└── index.js            # Entry point
```

## Deployment

The application can be deployed to any static hosting service:

- **Vercel**: Connect your Git repository for automatic deployments
- **Netlify**: Deploy with continuous integration
- **GitHub Pages**: Host directly from your repository

### Build Configuration

The production build generates optimized static files in the `dist/` directory that can be served by any web server.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Backend Setup

See `backend/README.md` for backend setup instructions.

## License

Copyright © 2025 Trippo. All rights reserved.
