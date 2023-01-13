# Lookback-FACEIT
Find FACEIT matches where you played with a specific player, using FACEIT's API. The application also features an alternative match viewer for looking at match data that is otherwise too old to access via FACEIT's official website, yet still exist on their databases. 

## Website

https://lookback-faceit.cyclic.app/

## Instructions

Type 2 usernames and click "Search" to view the 2 user's most recent mutual matches. At the bottom, click "Load More" to view older mutual matches, if there are any.

The usernames are not case sensitive but if two or more users exist with the same letters, it will prioritize a true match if it exists, or settle for the first matching user if a true match does not exist.

## Use Case

FACEIT is a competitive esports platform which offers third-party matchmaking services for a multitude of online games (such as Counter-Strike: Global Offensive and League of Legends), where the matches are stored on FACEIT's own databases. Those matches can be viewed as part of a match history, but that match history has limited functionality in terms of searching and filtering matches, making it difficult to find specific matches. One common problem is when users want to see the matches where they played with a particular user. This functionality does currently not exist in third-party applications, even though FACEIT's own API offers the tools for such functionality.

## Structure

The user input is in the form of 2 usernames, everything else is either automatic or hardcoded. Those usernames need to be translated into User IDs, which is used when querying for a user's match history. We then query the games from User 1 and look through them, seeking User 2. If any games are found, those are added to the object that is later returned.

As a result, a total of 4 API requests are made to FACEIT's API, per search. 2 requests are for translating the usernames and 2 additional requests are for looking at User 1's most recent 100 matches, for a total of 200 matches. This is not a problem since FACEIT's API is rate limited at 10,000 requests per hour, which means 2,500 lookbacks per hour.

Additionally, the legacy match viewer exists on [/viewer](https://lookback-faceit.cyclic.app/viewer), where you can supply your own Match ID and be redirected to [/viewer/:matchId](https://lookback-faceit.cyclic.app/viewer/1-8a09ccdb-cbc1-43d1-a14c-60e010ad0397) for viewing the specific match data. The purpose is only to look at the raw JSON data so it makes 2 requests, 1 for the match info (configuration, players, etc.) and 1 for the match stats (player results and scores).

## Design

The server's main endpoint is used both when searching for brand new users, and when loading more games from 2 users. In either case we spend API requests on getting the User IDs, which may seem wasteful if we already got them from a previous search. However, we should always verify the input, which includes making a request for a username or User ID, before we can use it. We would otherwise have to assume that all input is valid, which would lead to unwanted behaviour. It is also more efficient to reuse the existing code, since all that differs is the amount of games to skip (an offset).

Furthermore, requesting a user's match history can only be done for a maximum amount of 100 games per request and we have no way of knowing if there will be more games after those 100 games until we look at the response. In an effort to prioritize speed, we issue the requests in parallel while limiting the amount of requests in order to reduce unnecessary checks. It is then up to the user to decide whether or not to check more games, since the first games may already have been enough.

Alternatively, we could issue the requests serially, continually checking if there may be more games after the current response, which would ensure all games are checked in one go, but that would be significantly slower. Most users are also likely not concerned with checking all games.

## Problems Encountered

* **Halve amount of requests**

    An initial approach to checking for mutual games was to request X amount of games from user 1, X amount of games from user 2, and iterate through them to see if there was any overlapping games. However, a more efficient approache was obviously to just request X amount of games from one of the users, and check if the other user's ID appears in any of them.

* **Count-based offset vs time-based offset**

    The FACEIT API request for fetching a user's match history uses 2 types of offsets to filter which games to return: count-based and time-based. The count-based offset uses an integer Y and skips the Y most recent games in the users match history, and then returns the desired amount of most recent games. The time-based offset is a unix timestamp where an arbitrary amount of the most recent games are still returned, but it only considers games which started before the timestamp. Initially, I used the count-based offset for loading more games, but it gave only errors if the offset was set to something greater than 1,000. As a result, I switched over to the slightly less convenient time-based offset when loading more games, using the timestamp of the starting time for the last fetched game. However, I still use the count-based offset when dealing with requests issued in parallel, since it is impossible to know when the last game started before reading the response. This behaviour is undocumented in the official documentation.

## Endpoints

The server's API is not indended for public use, but is open nonetheless. The server only has 3 endpoints, 1 meant for the lookback functionality itself, and 2 for the legacy viewer:

*   `POST /mutualGames`, requires the following body:
    
    ```
    {
        user1,          // String - Nickname of user1,
        user2,          // String - Nickname of user2,
        count,          // Integer - Amount of games to check, is multiple of 100,
        game,           // String - Game ID, e.g. "lol_EUW", "csgo", "lol_EUN", etc.
        last_time,      // Integer - The timestamp (Unix time) as higher bound for games
    }
    ```

*   `POST /getMatchInfo`, requires the following body:
    
    ```
    {
        matchId         // The FACEIT Match ID
    }
    ```

*   `POST /getMatchStats`, requires the following body:
    
    ```
    {
        matchId         // The FACEIT Match ID
    }
    ```

