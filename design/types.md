# GrabbitHole types

Every person in GrabbitHole is a Registering user. That user is the one who has a password in Authenticating and the one a sign-in session belongs to. Each concept that takes a `User` in our concept design (DiscoveryLinking, Collaborating, Contributing, and Sessioning) is instantiated with `Registering.User` when it is added here.

SignIn is the sign-in session: it answers "who is making this request". The browsing-session concept from our F3 concept design keeps the name Sessioning.

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

instantiate DiscoveryLinking with
  User is Registering.User

instantiate Collaborating with
  User is Registering.User
  Item is DiscoveryLinking.Graph

instantiate Contributing with
  User is Registering.User
  Item is DiscoveryLinking.Graph
  Change is Text

```
