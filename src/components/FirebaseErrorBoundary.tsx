"use client";

import React from "react";

type State = { error: Error | null };

export default class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      let friendly = this.state.error.message;
      try {
        const parsed = JSON.parse(this.state.error.message) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed.error) {
          friendly = `Database access error (${parsed.operationType ?? "operation"} on ${parsed.path ?? "document"}): ${parsed.error}`;
        }
      } catch {
        // Use raw message
      }

      return (
        <div className="mx-auto my-8 max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h2 className="text-lg font-bold">Database permission or connection issue</h2>
          <p className="mt-2 break-words text-sm text-rose-800">{friendly}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
