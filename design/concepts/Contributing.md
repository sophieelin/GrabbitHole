
# Contributing

## Purpose

Allow users to propose changes to shared work while preventing unapproved modifications.

## Principle

A user proposes a change to someone else's work. An authorized reviewer can accept the proposal, incorporating the change into the original work, or reject it, leaving the original unchanged.

## Types

```types
external User
  A person who proposes or reviews changes.

external Item
  The shared work targeted by a proposal.

external Change
  A proposed modification and its arguments.

Status is PENDING or ACCEPTED or REJECTED or WITHDRAWN
```

## State

```state
a set of Proposals with
  a proposer User
  a target Item
  a change Change
  a status Status
  an optional reviewer User
  an optional reason String

```

## Actions

```actions
propose(user: User, target: Item, change: Change) : returns (proposal: Proposal)
  where true
  then
    add a new Proposal with
      proposer user,
      target target,
      change change,
      status PENDING,
      no reviewer,
      and no reason
    returns proposal


accept(proposal: Proposal, reviewer: User) : returns ()
  where proposal is not in Proposals
  then
    refuses PROPOSAL_NOT_FOUND "There is no such proposal."
  where proposal is in Proposals and proposal's status is not PENDING
  then
    refuses PROPOSAL_NOT_PENDING "This proposal is no longer pending."
  where proposal is in Proposals and proposal's status is PENDING
  then
    set proposal's status to ACCEPTED
    set proposal's reviewer to reviewer
    returns

reject(proposal: Proposal, reviewer: User, reason: String) : returns ()
  where proposal is not in Proposals
  then
    refuses PROPOSAL_NOT_FOUND "There is no such proposal."
  where proposal is in Proposals and proposal's status is not PENDING
  then
    refuses PROPOSAL_NOT_PENDING "This proposal is no longer pending."
  where proposal is in Proposals and proposal's status is PENDING
  then
    set proposal's status to REJECTED
    set proposal's reviewer to reviewer
    set proposal's reason to reason
    returns

withdraw(proposal: Proposal, user: User) : returns ()
  where proposal is not in Proposals
  then
    refuses PROPOSAL_NOT_FOUND "There is no such proposal."
  where proposal is in Proposals and proposal's status is not PENDING
  then
    refuses PROPOSAL_NOT_PENDING "This proposal is no longer pending."
  where proposal is in Proposals and user is not proposal's proposer
  then
    refuses NOT_PROPOSER "Only the proposer can withdraw this proposal."
  where proposal is in Proposals, proposal's status is PENDING, and user is proposal's proposer
  then
    set proposal's status to WITHDRAWN
    returns

```

## Queries

```queries
_proposal(proposal: Proposal) : optional (proposer: User, target: Item, change: Change, status: Status, reviewer: User, reason: String)
  Returns the proposal's information, or no row for an unknown proposal.

_pending(target: Item) : many (proposal: Proposal, proposer: User, change: Change)
  Returns all pending proposals targeting the given item.
```
