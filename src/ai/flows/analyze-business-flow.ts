'use server';
/**
 * @fileOverview Agent d'analyse business pour TP Master.
 *
 * - analyzeBusiness - Fonction principale d'analyse des stocks et paiements.
 * - AnalyzeBusinessInput - Schéma d'entrée (données brutes).
 * - AnalyzeBusinessOutput - Schéma de sortie (analyse textuelle).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeBusinessInputSchema = z.object({
  products: z.array(z.any()).describe('La liste actuelle des produits en stock.'),
  payments: z.array(z.any()).describe('La liste des paiements et factures.'),
  userPrompt: z.string().describe('La question spécifique de l\'utilisateur.'),
});
export type AnalyzeBusinessInput = z.infer<typeof AnalyzeBusinessInputSchema>;

const AnalyzeBusinessOutputSchema = z.object({
  analysis: z.string().describe('L\'analyse détaillée et structurée générée par l\'IA.'),
});
export type AnalyzeBusinessOutput = z.infer<typeof AnalyzeBusinessOutputSchema>;

export async function analyzeBusiness(input: AnalyzeBusinessInput): Promise<AnalyzeBusinessOutput> {
  return analyzeBusinessFlow(input);
}

const analyzePrompt = ai.definePrompt({
  name: 'analyzeBusinessPrompt',
  input: { schema: AnalyzeBusinessInputSchema },
  output: { schema: AnalyzeBusinessOutputSchema },
  prompt: `Tu es un assistant business expert pour l'entreprise TP Master.
  
Voici les données actuelles de l'entreprise :
- Inventaire : {{{products}}}
- Paiements/Factures : {{{payments}}}

Question de l'utilisateur : {{{userPrompt}}}

Instructions :
1. Analyse les tendances, les alertes de stock bas et les goulots d'étranglement financiers.
2. Note que les paiements utilisent des modes comme Chèque, Virement et Espèces.
3. Sois professionnel, concis et structure ta réponse avec des points clés.
4. Réponds toujours en Français.`,
});

const analyzeBusinessFlow = ai.defineFlow(
  {
    name: 'analyzeBusinessFlow',
    inputSchema: AnalyzeBusinessInputSchema,
    outputSchema: AnalyzeBusinessOutputSchema,
  },
  async input => {
    const { output } = await analyzePrompt(input);
    return output!;
  }
);
