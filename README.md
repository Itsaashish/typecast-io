# 🚀 TypeCast.io - Instant JSON to Multi-Language Model Generator

**TypeCast.io** is a modern, developer-focused web application built to convert raw JSON inputs instantly into strongly-typed model definitions and data classes across 9 different target languages. 

Operating entirely on the client side, TypeCast.io allows developers to paste JSON API responses, select their target language, tweak code preferences, and instantly copy or download generated models without sending sensitive payload data to any backend servers.

---

## ✨ Features

- **Multi-Language Generator Stack**: Outputs clean, standard code architectures for:
  1. **Angular / TypeScript Interfaces**: Plain structure objects.
  2. **Angular / TypeScript Classes**: Classes featuring model instance maps and constructor parsing.
  3. **C# Classes**: Strongly typed classes with System.Text.Json property mappings.
  4. **Java Classes**: Plain Old Java Objects (POJOs) with Jackson annotations.
  5. **Kotlin Data Classes**: Compact classes using Gson SerializedName.
  6. **Dart Classes**: Null-safe definitions featuring `fromJson` mapping factories.
  7. **Swift Structs**: Codable models matching CodingKeys parameters.
  8. **Go Structs**: Structures featuring json annotations and pointer type references.
  9. **Python Dataclasses**: Employs `@dataclass` structures, sorting optional fields last.
- **Modern Developer Experience**:
  - Full **Monaco Editor** integration (powers VS Code) with custom themes, autocomplete, map validation, and read-only preview panels.
  - Multi-theme support using daisyUI: **dark**, **light**, **slate** (custom slate gray), **coffee**, **cupcake**, **synthwave**, **dracula**, and **nord**.
  - Dynamic input validation with precise character position conversion to **line and column numbers**.
  - Keyboard shortcuts (`Ctrl + Enter` to compile, `Ctrl + Shift + C` to copy output, `Ctrl + K` to clear workspace).
  - Smart uploader supporting file uploading and drag-and-drop.
- **Fast & Private**: Client-side parsing ensures that your JSON payloads never leave your browser.

---

## 🛠️ Technology Stack

- **Framework**: Angular 20 (Standalone Architecture)
- **State Management**: Angular Signals
- **Forms**: Angular Reactive Forms
- **Styling**: Tailwind CSS v4.0 & PostCSS
- **Component System**: daisyUI v5


---

## 🚀 Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) installed locally (version 18+ recommended).

### Installation

1. Clone this repository to your system.
2. Install the workspace dependencies:
   ```bash
   npm install
   ```

### Running Locally

To launch the local development server:
   ```bash
   npm run dev
   # or
   ng serve
   ```
Open `http://localhost:4200` in your browser.

### Building for Production

To create an optimized production bundle:
   ```bash
   ng build
   ```

The compiled output will be generated under the `dist/` folder, ready to be served by any static hosting provider.
