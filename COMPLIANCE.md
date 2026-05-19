# Compliance Notes

This project is designed to support compliance-aware usage. It does not guarantee legal compliance by itself.

## LGPD

Use the actor with data minimization in mind:

- collect only the Instagram targets required for the task
- avoid storing cookies, tokens, or identifiers longer than necessary
- keep outputs limited to the purpose of the run
- delete datasets and logs when they are no longer needed
- ensure there is a lawful basis and appropriate notice for any personal data processing

## Meta / Instagram

The actor must not be used to:

- bypass access controls
- harvest credentials
- scrape private content without permission
- circumvent rate limits or technical restrictions
- sell or republish data in a way that violates applicable terms or law

Use only where you have the rights, authorization, and a lawful basis to process the data.

## Google

If this project is combined with Google products or disclosures, keep the public privacy notice clear about:

- what data is collected
- why it is collected
- where it is stored
- how long it is retained
- how a user can request deletion

## Operational Rule

Compliance is a deployment and usage responsibility. The code should remain conservative: minimal data, explicit errors, and no hidden persistence of secrets.
