# DiscoveryLinking

## Purpose

Preserve connections between sources so that users can understand how discoveries relate to one another and trace the paths between them.

## Principle

Maya adds two articles to a research graph and connects the first to the second, adding a note explaining that the second article's study is the evidence the first one cites. Sam later opens the graph, follows the connection from the first article to the second, and reads Maya's note to understand how the sources relate and why. When Maya's preliminary graph from a browsing session is merged into the project's main graph, the articles and connection that the main graph already had are matched by URL instead of duplicated, and both graphs' notes and contributors are kept, while the preliminary graph itself is left unchanged.

## Types

```types
external User
  A person who contributes sources and connections or writes notes.
```

## State

```state
a set of Graphs with
  a name String
  a sources set of Sources
  a connections set of Connections

a set of Sources with
  a url String
  a notes set of Notes
  a contributors set of Users

a set of Notes with
  a text String
  an author User
  an optional origin Note

a set of Connections with
  a source Source
  a destination Source
  a notes set of Notes
  a contributors set of Users

Rule: Each Source belongs to exactly one Graph.
Rule: Each Connection belongs to exactly one Graph.
Rule: No two Sources within the same Graph have the same URL.
Rule: No two Connections within the same Graph have the same source and destination.
Rule: Both endpoints of a Connection belong to the same Graph as the Connection.
Rule: Each Note belongs to exactly one Source or Connection.
Rule: A note copied by a merge has as its origin the note it was first written as, following the origins of copies of copies; a note written directly has no origin.
Rule: No Source or Connection has two notes with the same origin, nor a note whose origin is another of its notes.
```

## Actions

```actions
createGraph(name: String) : returns (graph: Graph)
  where true
  then
    add a new graph with name and no sources or connections
    returns graph

addSource(graph: Graph, url: String, contributor: User) : returns (source: Source)
  where graph is not in Graphs
  then
    refuses GRAPH_NOT_FOUND "There is no such graph."
  where some source in graph's sources has url
  then
    refuses SOURCE_EXISTS "This graph already has a source with that URL."
  where graph is in Graphs and no source in graph's sources has url
  then
    add a new source with url, no notes, and contributors containing only contributor
    add source to graph's sources
    returns source

addConnection(graph: Graph, source: Source, destination: Source, contributor: User) : returns (connection: Connection)
  where graph is not in Graphs
  then
    refuses GRAPH_NOT_FOUND "There is no such graph."
  where source or destination is not in graph's sources
  then
    refuses SOURCE_NOT_IN_GRAPH "Both sources of a connection must belong to its graph."
  where some connection in graph's connections has source and destination
  then
    refuses CONNECTION_EXISTS "This graph already has a connection from that source to that destination."
  where graph is in Graphs, source and destination are in graph's sources, and no connection in graph's connections has source and destination
  then
    add a new connection with source, destination, no notes, and contributors containing only contributor
    add connection to graph's connections
    returns connection

addNoteToSource(source: Source, author: User, text: String) : returns (note: Note)
  where source is not in Sources
  then
    refuses SOURCE_NOT_FOUND "There is no such source."
  where source is in Sources
  then
    add a new note with text and author
    add note to source's notes
    returns note

addNoteToConnection(connection: Connection, author: User, text: String) : returns (note: Note)
  where connection is not in Connections
  then
    refuses CONNECTION_NOT_FOUND "There is no such connection."
  where connection is in Connections
  then
    add a new note with text and author
    add note to connection's notes
    returns note

removeSource(graph: Graph, source: Source) : returns ()
  where graph is not in Graphs
  then
    refuses GRAPH_NOT_FOUND "There is no such graph."
  where source is not in graph's sources
  then
    refuses SOURCE_NOT_IN_GRAPH "That source does not belong to this graph."
  where graph is in Graphs and source is in graph's sources
  then
    remove source and its notes
    remove every connection whose source or destination is source, and their notes
    returns

removeConnection(graph: Graph, connection: Connection) : returns ()
  where graph is not in Graphs
  then
    refuses GRAPH_NOT_FOUND "There is no such graph."
  where connection is not in graph's connections
  then
    refuses CONNECTION_NOT_IN_GRAPH "That connection does not belong to this graph."
  where graph is in Graphs and connection is in graph's connections
  then
    remove connection and its notes, leaving its source and destination in the graph
    returns

editNote(note: Note, text: String) : returns ()
  where note is not in Notes
  then
    refuses NOTE_NOT_FOUND "There is no such note."
  where note is in Notes
  then
    set note's text to text, keeping its author
    returns

removeNote(note: Note) : returns ()
  where note is not in Notes
  then
    refuses NOTE_NOT_FOUND "There is no such note."
  where note is in Notes
  then
    remove note from its source's or connection's notes
    remove note
    returns

mergeGraph(target: Graph, other: Graph) : returns ()
  where target or other is not in Graphs
  then
    refuses GRAPH_NOT_FOUND "There is no such graph."
  where target is other
  then
    refuses SAME_GRAPH "A graph cannot be merged into itself."
  where target and other are in Graphs and target is not other
  then
    for each source in other's sources, use the source in target's sources with the same url, or add a new one to target with that url
    for each connection in other's connections, use the connection in target's connections whose source and destination have the same urls, or add a new one to target between the target sources with those urls
    add the contributors of each source and connection in other to its counterpart in target
    for each note in other, take its origin, or the note itself when it has no origin
    unless the counterpart in target already has a note that is that origin or has it as its origin, add a new note to the counterpart with that origin and the note's text and author
    leave other, its sources, connections, and notes unchanged
    returns
```

## Queries

```queries
_graph(graph: Graph) : optional (name: String)
  Returns the graph's name, or no row for an unknown graph.

_sources(graph: Graph) : many (source: Source, url: String)
  Returns every source in the graph with its URL, ordered by URL. Returns no rows for an unknown graph or a graph with no sources.

_sourceByUrl(graph: Graph, url: String) : optional (source: Source)
  Returns the graph's source with exactly this URL, or no row when the graph has none or is unknown.

_note(note: Note) : optional (graph: Graph, author: User, text: String)
  Returns the graph of the source or connection the note is on, with the note's author and text, or no row for an unknown note.

_source(source: Source) : optional (graph: Graph, url: String)
  Returns the graph the source belongs to and its URL, or no row for an unknown source.

_connections(graph: Graph) : many (connection: Connection, source: Source, destination: Source)
  Returns every connection in the graph with its source and destination, ordered by when each connection was added to the graph. Returns no rows for an unknown graph or a graph with no connections.

_connection(connection: Connection) : optional (graph: Graph, source: Source, destination: Source)
  Returns the graph the connection belongs to and its source and destination, or no row for an unknown connection.

_sourceContributors(source: Source) : many (contributor: User)
  Returns each contributor of the source once, ordered by when they first contributed it. Returns no rows for an unknown source.

_connectionContributors(connection: Connection) : many (contributor: User)
  Returns each contributor of the connection once, ordered by when they first contributed it. Returns no rows for an unknown connection.

_sourceNotes(source: Source) : many (note: Note, author: User, text: String)
  Returns every note on the source with its author and text, ordered by when each note was added. Returns no rows for an unknown source or a source with no notes.

_connectionNotes(connection: Connection) : many (note: Note, author: User, text: String)
  Returns every note on the connection with its author and text, ordered by when each note was added. Returns no rows for an unknown connection or a connection with no notes.
```
