/*
Only serves to validate payment options
*/

export interface PaymentOption {
  readonly key: string;
  readonly name: string;
  readonly amount: number;
  readonly curr: string;
  readonly isFallback?: boolean;
  readonly ccodes?: string[];
  readonly period: string;
  readonly duration: number;
  readonly maxRepeats: number;
}
