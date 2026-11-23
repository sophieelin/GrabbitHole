# GrabbitHole types

Every person in GrabbitHole is a Registering user. That user is the one who has a password in Authenticating and the one a sign-in session belongs to. Each concept that takes a `User` in our concept design (DiscoveryLinking, Collaborating, Contributing, and Sessioning) is instantiated with `Registering.User` when it is added here.

Grouping organizes the sources of one research graph into named topic groups: its `Item` is a DiscoveryLinking source and its `Scope` is the graph the source belongs to.

SignIn is the sign-in session: it answers "who is making this request". Sessioning is the browsing-session concept from our F3 concept design: it records the URLs visited during a research session and which pages led to which.

```types
concrete Text
  A serialized proposed operation and its arguments.
```
```instances
instantiate Registering

instantiate Authenticating with
  User is Registering.User

instantiate SignIn with
  Subject is Registering.User

instantiate Sessioning with
  User is Registering.User
  Item is DiscoveryLinking.Graph

instantiate DiscoveryLinking with
  User is Registering.User

instantiate Collaborating with
  User is Registering.User
  Item is DiscoveryLinking.Graph

instantiate Contributing with
  User is Registering.User
  Item is DiscoveryLinking.Graph
  Change is Text

instantiate Grouping with
  Item is DiscoveryLinking.Source
  Scope is DiscoveryLinking.Graph

```
