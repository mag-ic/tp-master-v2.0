'use server';

/**
 * @fileOverview This file defines a Genkit flow to validate and fix Next.js code using AI.
 *
 * - validateAndFixCode - A function that validates and fixes code.
 * - ValidateAndFixCodeInput - The input type for the validateAndFixCode function.
 * - ValidateAndFixCodeOutput - The return type for the validateAndFixCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateAndFixCodeInputSchema = z.object({
  code: z.string().describe('The Next.js code to validate and fix.'),
  originalReactCode: z.string().describe('The original React code before conversion.'),
});
export type ValidateAndFixCodeInput = z.infer<typeof ValidateAndFixCodeInputSchema>;

const ValidateAndFixCodeOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the code is valid or not.'),
  fixedCode: z.string().describe('The corrected Next.js code, if any.'),
  errors: z.array(z.string()).describe('List of errors found in the code.'),
  suggestions: z.array(z.string()).describe('Suggestions to improve the code.'),
});
export type ValidateAndFixCodeOutput = z.infer<typeof ValidateAndFixCodeOutputSchema>;

export async function validateAndFixCode(input: ValidateAndFixCodeInput): Promise<ValidateAndFixCodeOutput> {
  return validateAndFixCodeFlow(input);
}

const validateAndFixCodePrompt = ai.definePrompt({
  name: 'validateAndFixCodePrompt',
  input: {schema: ValidateAndFixCodeInputSchema},
  output: {schema: ValidateAndFixCodeOutputSchema},
  prompt: `You are a senior Next.js developer. You will validate the converted Next.js code and suggest fixes.

Original React Code: {{{originalReactCode}}}

Converted Next.js Code: {{{code}}}

Respond in JSON format.
`,
});

const validateAndFixCodeFlow = ai.defineFlow(
  {
    name: 'validateAndFixCodeFlow',
    inputSchema: ValidateAndFixCodeInputSchema,
    outputSchema: ValidateAndFixCodeOutputSchema,
  },
  async input => {
    const {output} = await validateAndFixCodePrompt(input);
    return output!;
  }
);
