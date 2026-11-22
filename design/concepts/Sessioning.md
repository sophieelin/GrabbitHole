# Sessioning

## Purpose

Preserve the paths between visited sources so users can understand how they discovered information during a browsing session.

## Principle

A user starts a browsing session while researching a topic. They open several articles from the same website in different tabs, then follow additional links from those articles. The system records the visited URLs and which pages led to other pages, without duplicating sources or connections. When the session ends, the recorded research paths are saved for later review.

## Types

```types
external User
  The researcher a browsing session belongs to.

external Item
  The item a browsing session records into.

Status is ACTIVE or STOPPED
  Whether a browsing session is still recording visits.
```

## State

```state
a set of Sessions with
  a user User
  a status Status
  a visited set of String
  an optional item Item

a set of Connections with
  a session Session
  a source String
  a destination String

Rule: No two Connections have the same session, source, and destination.
Rule: Each Item is associated with at most one Session.
```

## Actions

```actions
startSession(user: User) : returns (session: Session)
  where true
  then
    create a new Session with user set to given user, status set to ACTIVE, an empty set of visited URLs, and no associated item
    returns session

setItem(session: Session, item: Item) : returns ()
  where session does not exist
  then
    refuses SESSION_NOT_FOUND "There is no such session."
  where session exists and session has an associated item
  then
    refuses ITEM_ALREADY_SET "This session already has an associated item."
  where some other session in Sessions has item
  then
    refuses ITEM_ALREADY_ASSOCIATED "This item is already associated with another session."
  where session exists, session has no associated item, and no other session has item
  then
    set session's item to item
    returns

recordVisit(session: Session, url: String, sourceUrl?: String) : returns ()
  where session does not exist
  then
    refuses SESSION_NOT_FOUND "There is no such session."
  where session exists and session's status is not ACTIVE
  then
    refuses SESSION_NOT_ACTIVE "This session has stopped."
  where session exists and session's status is ACTIVE
  then
    add url to session's visited URLs if not already present
    if sourceUrl is provided and different from url, add sourceUrl to session's visited URLs if not already present
    if sourceUrl is provided and different from url, and no Connection with the same session, source, and destination exists, create a Connection with session set to given session, source set to sourceUrl, and destination set to url
    returns

stopSession(session: Session) : returns ()
  where session does not exist
  then
    refuses SESSION_NOT_FOUND "There is no such session."
  where session exists and session's status is not ACTIVE
  then
    refuses SESSION_NOT_ACTIVE "This session has stopped."
  where session exists and session's status is ACTIVE
  then
    set session's status to STOPPED
    returns
```

## Queries

```queries
_session(session: Session) : optional (user: User, status: Status)
  Returns the session's user and status, or no row for an unknown session.

_getItem(session: Session) : optional (item: Item)
  Returns the item associated with the session, or no row if the session is unknown or has none.

_getSessionByItem(item: Item) : optional (session: Session)
  Returns the session associated with the item, or no row if none exists.

_visited(session: Session) : many (url: String)
  Returns each URL visited in the session once, ordered by when it was first recorded. Returns no rows for an unknown session or a session with no visits.

_connections(session: Session) : many (source: String, destination: String)
  Returns every connection recorded in the session, ordered by when each was first recorded. Returns no rows for an unknown session or a session with no connections.
```
