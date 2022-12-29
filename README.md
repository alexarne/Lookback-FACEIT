# Lookback-FACEIT
Find FACEIT matches where you played with a specific player, using FACEIT's API

## Website

https://lookback-faceit.cyclic.app/

## Instructions

Type 2 usernames and click "Search" to view the 2 user's most recent mutual matches. At the bottom, click "Load More" to view older mutual matches, if there are any.

## Use Case

FACEIT is a competitive esports platform which offers third-party matchmaking services for a multitude of online games (such as Counter-Strike: Global Offensive and League of Legends), where the matches are stored on FACEIT's own databases. Those matches can be viewed as part of a match history, but that match history has limited functionality in terms of searching and filtering matches, making it difficult to find specific matches. One common problem is when users want to see the matches where they played with a particular user. This functionality does currently not exist in third-party applications, even though FACEIT's own API offers the tools for such functionality.

## Structure

The user input is in the form of 2 usernames, everything else is either automatic or hardcoded. Those usernames need to be translated into User IDs, which is used when querying for a user's match history. We then query the games from User 1 and look through them, seeking User 2. If any games are found, those are added to the object that is later returned.

As a result, a total of 4 API requests are made to FACEIT's API, per search. 2 requests are for translating the usernames and 2 additional requests are for looking at User 1's most recent 100 matches, for a total of 200 matches. This is not a problem since FACEIT's API is rate limited at 10,000 requests per hour, which means 2,500 lookbacks per hour.

## Design

The server's endpoint is used both when searching for brand new users, and when loading more games from 2 users. In either case we spend API requests on getting the User IDs, which may seem wasteful if we already got them from a previous search. However, we should always verify the input, which includes making a request for a username or User ID, before we can use it. We would otherwise have to assume that all input is valid, which would lead to unwanted behaviour. It is also more efficient to reuse the existing code, since all that differs is the amount of games to skip (an offset).

Furthermore, requesting a user's match history can only be done for a maximum amount of 100 games per request and we have no way of knowing if there will be more games after those 100 games until we look at the response. In an effort to prioritize speed, we issue the requests in parallel while limiting the amount of requests in order to reduce unnecessary checks. It is then up to the user to decide whether or not to check more games, since the first games may already have been enough.

Alternatively, we could issue the requests serially, continually checking if there may be more games after the current response, which would ensure all games are checked in one go, but that would be significantly slower. Most users are also likely not concerned with checking all games.

## Problems Encountered

* **Halve amount of requests**

    Only check user 1s games, halve amount of requests

* **Count-based offset vs time-based offset**

    Using offset field gave errors past 1000 in value, changed to time based offset

## Endpoints

The server's API is not indended for public use, but is open nonetheless. The server only has 1 endpoint, `POST /mutualGames`, which requires the following body:

