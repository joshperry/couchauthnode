Couch Mail
===============

I first played with CouchDB as I was evaluating nosql tech for a new project. 
This was my first foray into nosql, I immediately fell for CouchDB's HTTP ethos.

In fact, it sent me off on my first exploration into functional programming with Erlang as I wanted to understand how it worked.

About the same time I was also jonesing for a unified multi-domain mail exchange system for personal and small business use.

I decided to use CouchDB to drive the realtime data persistence story of this stack, ipso facto the name.

# Project

This project is a set of opinionated applications and configurations for deploying a multi-domain capable Postfix and Dovecot stack with user, alias, and routing scripts stored in CouchDB.

It at first began as a blog posts on ways describing ways to configure a mail exchange stack, that was a mistake.
This is a complicated undertaking, it would be nice to get some help keeping it fresh and limber.

As an output we want to provide one-button deployable, securely configured IMAP and SMTP services, with bad email mitigation (greylisting, trainable bayesian filtering, blacklists), and a user-scriptable routing engine in [Pigeonhole Sieve](https://wiki2.dovecot.org/Pigeonhole/Sieve).
Just run the stack, then route IMAP and SMTP ports, and configure DNS.

# Data Model

## Domain

## Mailbox

## Alias

## Sieve

## Authentication

Dovecot all the things!!

# Data Flow

## SMTP Receive

## SMTP Client Send

## IMAP Client

## Filtering and Routing

# Devops

## Data Persistence

## SMTP

## Greylisting

## SpamC

## Blacklisting

## IMAP

## LDA

## XMPP with Prosody

## The Pile of TODOs

- [ ] Arrange for the `/var/run/couchmail/` directory to exist before start
- [ ] Kickass management UI that's not Futon
- [ ] Add webmail client
- [ ] Containerize, duh
  - [ ] couchmail
  - [ ] Dovecot
  - [ ] Postfix
  - [ ] spamassassin
- [ ] Docker compose config
- [ ] Automate PKI config with letsencrypt.org
- [ ] Can we automate the DNS config in common deployment target environments?
- [ ] Kubernetes configs
