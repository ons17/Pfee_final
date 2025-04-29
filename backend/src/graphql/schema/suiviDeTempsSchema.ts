import { gql } from "apollo-server-express";

export const suiviDeTempTypeDefs = gql`
  scalar DateTimeISO

  type SuiviDeTemp {
    idsuivi: ID!
    heure_debut_suivi: DateTimeISO!
    heure_fin_suivi: DateTimeISO
    duree_suivi: Int
    description: String
    employee: Employee
    tache: Tache
    isPaused: Boolean!
    pausedDuration: Int!
    lastPausedTime: DateTimeISO
  }

  type ActiveSuivi {
    idsuivi: ID!
    heureDebutSuivi: DateTimeISO!
    isPaused: Boolean!
    exactPauseValue: Int
    pausedDuration: Int
    tache: ActiveSuiviTache!
  }

  type ActiveSuiviTache {
    idTache: ID!
    idProjet: ID!
    titreTache: String
    nomProjet: String
  }

  type StopSuiviPayload {
    success: Boolean!
    message: String
    suivi: SuiviDeTemp
  }

  input SuiviDeTempFilterInput {
    startDate: DateTimeISO
    endDate: DateTimeISO
    employeeId: ID
    taskId: ID
    projectId: ID
    isActive: Boolean
  }

  input CreateSuiviInput {
    heure_debut_suivi: DateTimeISO!
    idEmployee: ID!
    idTache: ID!
    description: String
  }

  input UpdateSuiviInput {
    heure_debut_suivi: DateTimeISO
    heure_fin_suivi: DateTimeISO
    duree_suivi: Int
    description: String
  }

  type SuiviStatsResponse {
    group: String!
    totalHours: Float!
    entries: [SuiviStatsEntry!]!
  }

  type SuiviStatsEntry {
    id: ID!
    name: String!
    hours: Float!
    percentage: Float!
  }

  type Query {
    suivisDeTemp(filters: SuiviDeTempFilterInput): [SuiviDeTemp!]!
    suiviDeTemp(id: ID!): SuiviDeTemp
    getActiveSuivi(employeeId: ID!): ActiveSuivi
    suiviStats(
      filters: SuiviDeTempFilterInput!
      groupBy: String!
    ): SuiviStatsResponse!
  }

  type PauseResumePayload {
    success: Boolean!
    message: String
    suivi: SuiviDeTemp
  }

  type ForceResumePayload {
    success: Boolean!
    message: String!
    resumedCount: Int!
  }

  type Mutation {
    createSuiviDeTemp(input: CreateSuiviInput!): SuiviDeTemp!
    updateSuiviDeTemp(id: ID!, input: UpdateSuiviInput!): SuiviDeTemp!
    deleteSuiviDeTemp(id: ID!): Boolean!
    stopActiveSuivi(idEmployee: ID!, description: String): StopSuiviPayload
    pauseSuivi(id: ID!): PauseResumePayload
    resumeSuivi(id: ID!): PauseResumePayload
    forceResumeAllPaused: ForceResumePayload!
  }
`;