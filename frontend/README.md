# PPDM 3.9 Metamodeler Browser Frontend

This repository contains the frontend application for the PPDM 3.9 Metamodeler Browser. It is a single-page application built with React and Vite, styled with Tailwind CSS, designed to visualize and interact with metadata related to the PPDM 3.9 data model.

## Features

*   **Dashboard:** Overview of the PPDM 3.9 metadata.
*   **Tables:** Browse and search for tables within the PPDM 3.9 model.
*   **Table Detail:** View detailed information for specific tables, including columns, relationships, and other attributes.
*   **Column XRef:** Cross-reference information related to columns.
*   **Load Order:** Visualize data load order.
*   **Audit:** View audit trails and changes.
*   **ERD View:** Entity-Relationship Diagram visualization.

## Technologies Used

*   **React:** A JavaScript library for building user interfaces.
*   **Vite:** A fast build tool that provides a lightning-fast development experience.
*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
*   **JavaScript (ESM):** Modern JavaScript with module support.

## Getting Started

Follow these steps to set up and run the frontend application locally.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or yarn

### Installation

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Development Server

To start the development server with hot-reloading:

```bash
npm run dev
# or
yarn dev
```

The application will typically be available at `http://localhost:5173`.

### Building for Production

To build the application for production:

```bash
npm run build
# or
yarn build
```

The production-ready files will be generated in the `dist` directory.
