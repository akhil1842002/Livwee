import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Component Tree:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[350px] flex items-center justify-center p-6 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl shadow-sm text-center">
          <div className="max-w-md space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Something went wrong</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                An unexpected error occurred in this section.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-left">
                  <p className="font-mono text-xs text-rose-600 dark:text-rose-400 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
            </div>
            <div className="pt-2">
              <Button
                onClick={this.handleReset}
                className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 text-xs font-semibold py-2 px-4 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
