# Lookback-FACEIT
Find FACEIT matches where you played with a specific player, using FACEIT's API

## Website

https://lookback-faceit.cyclic.app/

## Instructions

Type 2 usernames and click "Search" to view the 2 user's most recent mutual matches. At the bottom, click "Load More" to view older mutual matches, if there are any.

## Use Case

FACEIT is a competitive esports platform which offers third-party matchmaking services for a multitude of online games (such as Counter-Strike: Global Offensive and League of Legends), where the matches are stored on FACEIT's own databases. Those matches can be viewed as part of a match history, but that match history has limited functionality in terms of searching and filtering matches, making it difficult to find specific matches. One common problem is when users want to see the matches in which they played with another specific user. This functionality does currently not exist in third-party applications, even though FACEIT's own API offers the tools for such functionality.

## Structure

The user input is in the form of 2 usernames, everything else is either automatic or hardcoded. Those usernames need to be translated into User IDs, which is used when querying for the match history. We then query the games from User 1 and look through them, seeking User 2. If any games are found, those are added to the object that is later returned.

As a result, a total of 4 API requests are made to FACEIT's API, per search. 2 requests are for translating the usernames and 2 additional requests are for looking at User 1's most recent 100 matches, for a total of 200 matches. This is not a problem since FACEIT's API is rate limited at 10,000 requests per hour, which means 2,500 lookbacks per hour.

## Design

An initial lookup requires fetching the user id, but subsequent updates of loading more games doesnt require looking for the same user id again, since it can be reused. However, the request body must be verified before doing any requests, and that verification may either be incorrect or require a request on its own, which means its not viable to let the user save and give back the user id upon loading more games. The only real solution is to load more games to begin with, but that can be wasteful if its more than the user wants.

## Problems Encountered

Only check user 1s games, halve amount of requests

Using offset field gave errors past 1000 in value, changed to time based offset

## Endpoints

The server is not indended for public use, but is open nonetheless. The server only has 1 endpoint, `POST /mutualGames`, which requires the following body:

