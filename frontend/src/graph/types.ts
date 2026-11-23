import type { GrabbitHoleWireHttp } from "../../../generated/wire.ts";

type Wire = GrabbitHoleWireHttp;

/** A research graph as `/projects/graph` and `/sessions/graph` return it: sources, connections, and each one's notes and contributors. */
export type ResearchGraph = Wire["/projects/graph"]["output"]["graph"];
export type Source = ResearchGraph["sources"][number];
export type Connection = ResearchGraph["connections"][number];
export type Note = Source["notes"][number];
export type SourceId = Source["source"];
export type GraphId = ResearchGraph["graph"];
export type ProjectId = Wire["/projects/graph"]["input"]["project"];
export type ProposalId = Wire["/projects/contributions/accept"]["input"]["proposal"];
export type Project = Wire["/projects/mine"]["output"]["projects"][number];
export type Member = Wire["/projects/members"]["output"]["members"][number];
export type UserId = Member["user"];
export type PendingProposal = Wire["/projects/contributions/pending"]["output"]["proposals"][number];
export type Invitation = Wire["/invitations/mine"]["output"]["invitations"][number];
