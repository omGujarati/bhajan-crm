# Bhajan CRM

A Customer Relationship Management system built with Next.js, MongoDB, and Node.js.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **MongoDB** - NoSQL database (using native MongoDB driver, no ORM)
- **Node.js** - Runtime environment
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library
- **Urbanist Font** - Google Fonts integration

## Project Structure

```
bhajan-crm/
├── app/                # Next.js App Router (Client Frontend)
│   ├── api/           # API routes (Backend endpoints)
│   │   └── test/      # Test API endpoint
│   ├── page.tsx       # Home page
│   ├── layout.tsx     # Root layout
│   └── globals.css    # Global styles
├── client/            # Client utilities and helpers
├── components/        # React components
│   └── ui/          # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       └── text-field.tsx
├── lib/             # Utility functions
│   └── utils.ts     # cn() utility for class merging
├── server/          # Server utilities
│   └── db/         # Database connection
│       └── connection.ts
├── package.json     # Root package.json with all dependencies
├── next.config.js  # Next.js configuration
├── tailwind.config.ts # Tailwind CSS configuration
├── postcss.config.js  # PostCSS configuration
├── components.json   # shadcn/ui configuration
└── tsconfig.json    # TypeScript configuration
```

**Note:** Next.js requires the `app/` directory at the project root. The `app/` directory serves as the client frontend, while `app/api/` contains the backend API routes. The `server/` folder contains shared server utilities like database connections.

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   - Copy `.env.example` to `.env`
   - Update `MONGODB_URI` with your MongoDB connection string
   - Update `MONGODB_DB_NAME` with your database name

3. **Start MongoDB**

   - Make sure MongoDB is running on your local machine (default: `mongodb://localhost:27017`)
   - Or use MongoDB Atlas and update the connection string in `.env`

4. **Run Development Server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

5. **Build for Production**

   ```bash
   npm run build
   ```

6. **Start Production Server**
   ```bash
   npm start
   ```

## API Routes

- **GET /api/test** - Test endpoint that checks API and database connectivity

## Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build the application for production
- `npm start` - Start production server on port 3000
- `npm run lint` - Run ESLint

## Database Connection

The MongoDB connection is handled in `server/db/connection.ts`. It uses connection pooling and reuses existing connections.

## UI Components

The project includes shadcn/ui components:

- **Button** - `@/components/ui/button` - Multiple variants (default, outline, ghost, etc.)
- **Input** - `@/components/ui/input` - Basic input field
- **TextField** - `@/components/ui/text-field` - Input with label, error, and helper text

### Example Usage

```tsx
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export default function MyComponent() {
  return (
    <div>
      <TextField
        label="Email"
        type="email"
        placeholder="Enter your email"
        error="This field is required"
      />
      <Button variant="default" size="lg">
        Submit
      </Button>
    </div>
  );
}
```

## Styling

- **Light Mode**: Enabled globally (dark mode can be added later)
- **Font**: Urbanist from Google Fonts
- **Theme**: Custom Tailwind theme with CSS variables for easy theming
- All components use Tailwind CSS classes

## Notes

- The project uses Next.js App Router (not Pages Router)
- All API routes are in `app/api/` directory
- Server utilities are in `server/` directory
- No ORM is used - direct MongoDB driver is used
- Single `package.json` at the root manages all dependencies
- Frontend runs on port 3000 by default
- Tailwind CSS is configured with light mode by default
- shadcn/ui components are ready to use with full TypeScript support
