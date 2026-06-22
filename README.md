EMI Calculator – Shared Workspace

A modern EMI (Equated Monthly Installment) Calculator built with Next.js, TypeScript, and BroadcastChannel API.

The application allows users to calculate loan EMIs, explore repayment schedules, compare multiple loan scenarios, plan prepayments, and analyze EMI sensitivity. One of its key features is real-time synchronization across browser tabs — changes made in one tab instantly appear in all other open tabs without requiring a backend, database, or polling mechanism.

Key Features

EMI Calculator

* Adjust loan amount, interest rate, and tenure using sliders or input fields
* Instant EMI calculation
* Total interest and total repayment breakdown
* Principal vs Interest visualization

Amortization Schedule

* Month-by-month repayment breakdown
* Paginated repayment table
* Interactive chart view
* Automatic break-even month detection

Prepayment Planner

* Add multiple one-time prepayments
* View updated loan tenure
* Calculate interest savings instantly
* Updated amortization schedule after each prepayment

Loan Comparison

* Compare up to 3 loan scenarios
* Side-by-side EMI, interest, and repayment comparison
* Automatically highlights the most cost-effective option

Sensitivity Analysis

* Explore EMI changes for different interest rates and tenures
* Interactive 7×7 sensitivity matrix
* Current loan configuration highlighted

Real-Time Cross-Tab Synchronization

* Built using the native BroadcastChannel API
* Synchronizes:
    * Loan inputs
    * Theme preference
    * Prepayments
    * Comparison scenarios
    * Active workspace mode
* No backend required

Additional Features

* Active tab count tracking
* Light/Dark theme synchronization
* CSV export for amortization schedules
* Shareable URLs for loan configurations
* Responsive design
* Accessibility-friendly controls

⸻

Tech Stack

* Frontend: Next.js 16, React 19, TypeScript
* State Management: React Context + useReducer
* Styling: Tailwind CSS v4
* Charts: Recharts
* Testing: Vitest + React Testing Library
* Synchronization: BroadcastChannel API
* Deployment: Vercel

⸻

Project Highlights

* Production-ready architecture
* Strict TypeScript implementation
* Real-time cross-tab collaboration
* 265+ automated tests
* Responsive and accessible UI
* No backend dependencies
* Zero environment configuration required

⸻

Getting Started

Install Dependencies

npm install

Run Locally

npm run dev

Visit:

http://localhost:3001

Run Tests

npm run test

Production Build

npm run build
npm run start

⸻

Future Enhancements

* Persistent state across browser sessions
* Cross-device synchronization using a backend
* Multi-currency support
* Recurring prepayment support
* Advanced loan analytics

⸻

Built using Next.js, TypeScript, and BroadcastChannel API to demonstrate frontend architecture, state management, real-time synchronization, and financial computation workflows.