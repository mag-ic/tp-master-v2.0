# Checkpoint de Sauvegarde - État de Production (MAJ 24 Mai 2024)

**Date :** 24 Mai 2024 (Version 3.1 - Publication & Stabilité)
**Statut :** Optimal pour Déploiement Cloud

## Dernières Optimisations :

### 1. Module Finance & Trésorerie
- **Séparation des Flux** : Les "Apports Associés" (Compte Courant) sont désormais isolés dans une collection dédiée pour ne plus se mélanger aux factures commerciales.
- **Harmonisation Design** : L'en-tête de la Finance est 100% uniforme sur les 4 onglets (Factures, Achats, Charges, Apports) avec le code couleur rouge vif (`#E11D48`) pour l'état actif.
- **Précision Financière** : Correction du bug des micro-centimes. Application d'un arrondi strict à 2 décimales et d'un seuil de tolérance de 0.01 DH pour les statuts "Payé".

### 2. Gestion des Stocks & Ventes
- **Vente du Déclassé** : Ajout de la possibilité de choisir entre "Neuf" et "Déclassé" lors d'une vente, avec déduction automatique du bon compteur de stock.
- **Automatisation BC** : Génération automatique des références de Bons de Commande au format `BC-YY-XXXXX` (Ex: BC-24-00001).
- **Transformation BL en Facture** : Réactivation du bouton de génération de facture directement depuis la liste des ventes.
- **Prix d'Achat** : L'inventaire affiche désormais prioritairement le prix d'achat TTC au lieu du prix de vente.

### 3. Expertise Comptable & Partenaires
- **TVA 20%** : Intégration complète de la TVA dans le Bilan (Comptes 3455/4455), le CPC (Affichage HT) et le Grand Livre.
- **Relevé de Compte** : La fiche partenaire affiche désormais l'historique complet des paiements et le détail des dettes en cours.
- **Affichage Grand Livre** : Correction des coupures de lignes sur les montants via l'utilisation d'espaces insécables.

### 4. Architecture & Sécurité
- **Consultant (Lecture Seule)** : Protection stricte des écritures pour le compte `tarik@tpmaster.ma`.
- **Modales Trésorerie** : Alignement haut (`items-start`) pour garantir l'accès permanent aux contrôles de fermeture sur tous les écrans.

---
**Note technique :** L'application est validée pour un build de production. Toutes les routes utilisant des paramètres de recherche sont sécurisées par des boundaries `Suspense`.