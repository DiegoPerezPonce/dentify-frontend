# Dentify - Frontend

[![Angular Version](https://img.shields.io/badge/Angular-v20.3.9-DD0031?style=for-the-badge\&logo=angular\&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Backend Repo](https://img.shields.io/badge/Backend-Dentify--Backend-blue?style=for-the-badge\&logo=github)](https://github.com/DiegoPerezPonce/dentify-backend)

**Dentify** is a modern web application designed for comprehensive dental clinic management. It empowers dental health professionals to manage patient records, clinical histories, and treatments, featuring an intuitive and interactive odontogram.

---

## 🌟 Key Features

* 🦷 **Interactive Odontogram:** Dynamic visualization and condition/procedure recording per tooth.
* 📋 **Treatment Management:** Catalog and treatment selection tailored to individual patient records.
* 👤 **Patient File System:** Comprehensive registration, medical history, and continuous tracking.
* 🎨 **Modern & Responsive UI:** Designed with a seamless user experience (UX) and styled with SCSS.
* 🔒 **Secure Backend Integration:** Connected via REST API to the backend services layer.

---

## 📸 Screenshots

> *Add actual screenshots of your application here to improve visual impact.*

|                   Odontogram                   |              Treatment Management              |
| :--------------------------------------------: | :--------------------------------------------: |
| ![Odontogram](docs/screenshots/odontogram.png) | ![Treatments](docs/screenshots/treatments.png) |

---

## 🛠️ Tech Stack

* **Framework:** [Angular v20](https://angular.io/)
* **Languages:** TypeScript, HTML5, SCSS
* **Architecture:** Modular Components, Reactive Services (RxJS / Signals)
* **Build Tool:** Angular CLI

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

Ensure you have the following installed:

* [Node.js](https://nodejs.org/) — LTS version recommended
* [npm](https://www.npmjs.com/) or `pnpm`
* [Angular CLI](https://angular.io/cli) v20+

Install Angular CLI globally if necessary:

```bash
npm install -g @angular/cli
```

### Local Setup

#### 1. Clone the repository

```bash
git clone https://github.com/DiegoPerezPonce/dentify-frontend.git
cd dentify-frontend
```

#### 2. Install dependencies

Using npm:

```bash
npm install
```

Or using pnpm:

```bash
pnpm install
```

#### 3. Configure environment variables

Verify or update:

```text
src/environments/environment.ts
```

to point to your backend API URL:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

> Adjust the `apiUrl` according to your local `dentify-backend` configuration.

#### 4. Start the development server

```bash
ng serve
```

Navigate to:

```text
http://localhost:4200/
```

The application will automatically reload when source files are modified.

---

## 🧪 Testing & Build

### Unit Tests

Run the unit tests with:

```bash
ng test
```

### Production Build

Build the application for production:

```bash
ng build
```

Build artifacts will be stored in the:

```text
dist/
```

directory.

---

## 🔗 Related Repository

This frontend connects to the **Dentify Backend** service.

👉 [**Dentify Backend Repository**](https://github.com/DiegoPerezPonce/dentify-backend)

---

## 📄 License

This project is licensed under the **MIT License**.

See the [`LICENSE`](LICENSE) file for details.
