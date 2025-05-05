import { gql } from '@apollo/client/core';

export const GET_TACHES = gql`
  query GetTaches {
    taches {
      idTache
      titreTache
      descriptionTache
      dateDebutTache
      dateFinTache
      statutTache
      duration
      idProjet
      suiviDeTemps {
        idsuivi
        duree_suivi
      }
    }
  }
`;
