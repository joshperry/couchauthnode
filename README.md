Couch Mail
===============

The brains behind a set of opinionated applications and configurations for
deploying a multi-domain capable Postfix and Dovecot stack with user, alias,
and sieve scripts stored in CouchDB.

It also implements the Dovecot authentication protocol, which is widely used
for user auth _and_ config (like sieve scripts). 

## Config

Looks for couchdb config in the `COUCH_USER`, `COUCH_PASSWORD`, and
`COUCH_HOST` envvars.

## Postfix Lookups

Listens for postfix lookups on the following ports:

### 40571 - domains
Looks for a document with an ID of just the domain (i.e. `domain.tld`), this is
only a presence check so there are no other body properties.

### 40572 - mailboxes
Looks for a document with an ID of just the email address (i.e.
`user@domain.tld`). There are other properties on the document used by dovecot,
but for postfix this is only a presence check.

### 40573 - aliases
Looks for documents with an ID in the form of `alias-myalias@domain.tld`, the
`target` property is returned as the target email for the alias.

## Dovecot Auth

The dovecot auth protocol listens on a socket at
`/var/run/couchmail/dovecot-auth.sock` by default. Can be configured with
`COUCH_AUTH_SOCK` envvar.

This auth protocol looks up data by email address, so it is stored on the same
document that postfix searches to see if a mailbox exists. The dovecot
integration expects to find a `password` and optionally a `sieve` property on
the mailbox document.

The `password` property is the--ideally--salted and hashed password in a format that
dovecot understands.

The `sieve` property is a hash with the each sieve script name as the keys, with
the value being the ID--a random UUID--of a document holding the scripts
contents. The content document holds the script in its `script` property.

When we return the ID of the script content document, we include its `_rev`
appended as Dovecot caches any particular sieve script until its ID changes.
This lets us use simple static references between documents in our data model,
while automatically invalidating Dovecot's cache anytime a scripts content
document is changed.

This also accepts writes of sieve scripts for clients that support dovecot's
managesieve protocol.
