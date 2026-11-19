# GrabbitHole types

Every person in GrabbitHole is a Registering user. That user is the one who has a password in Authenticating and the one a sign-in session belongs to. Each concept that takes a `User` in our concept design (DiscoveryLinking, Collaborating, Contributing, and the browsing-session concept) is instantiated with `Registering.User` when it is added here.

Sessioning in this file is the sign-in session: it answers "who is making this request". It is not the browsing-session concept from our F3 concept design, which is also called Sessioning there. The reusable sign-in compositions refer to the sign-in concept by the name Sessioning, so the browsing-session concept needs a different name (such as Browsing) when it is added.

```instances
instantiate Registering

instantiate Authenticating with
  User is Registering.User

instantiate Sessioning with
  Subject is Registering.User

instantiate DiscoveryLinking with
  User is Registering.User
  
instantiate Collaborating with
  User is Registering.User
```
