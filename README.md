<div align="center">
<img width="1200" height="475" alt="SmartCare Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SmartCare

A smart healthcare platform to assist patients and medics in disaster areas.

## Getting Started

This project is built with React and Vite.

### Prerequisites

- Node.js

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   Create a `.env.local` file and add your API keys:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. Run the application:
   
   **Web Version (in Browser):**
   ```bash
   npm run dev
   ```

   **Desktop Version (Electron):**
   ```bash
   npm run electron:dev
   ```

4. Build for Production:
   
   **Web:** `npm run build`
   **Desktop (.exe):** `npm run electron:build`
