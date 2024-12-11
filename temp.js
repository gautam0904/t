   getLeaderBoard: async function (req, res, next) {
        let reqQuery = req.query;
        let leaderboardType = reqQuery.leaderboard || 'weekly_tickets';
        let itemsPerPage = parseInt(reqQuery.per_page) || 20;
        let currentPage = parseInt(reqQuery.current_page) || 1;
        let currentUserId = reqQuery.current_user_id || 0;
        let baseQuery = `SELECT user_id, username, CONCAT(first_name, " ", last_name) AS name, profile_picture, profile_picture_thumb, total_tickets, vip_level, total_no_of_giveaway_won, total_no_of_top_weekly_ticket_reward_won, device_region FROM ${constTableNames.USERS}`;

        let orderByClause = leaderboardType === 'vip_levels' 
            ? 'ORDER BY vip_level DESC, lifetime_ads_watched DESC' 
            : 'ORDER BY total_tickets DESC';

        let allUsersQuery = `${baseQuery} ${orderByClause}`;

        let allUsers = await dbClass.executeQuery(allUsersQuery);

        let currentUserRank = allUsers.data.findIndex(user => user.user_id == currentUserId);

        let paginatedRecords = allUsers.data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        paginatedRecords.forEach(user => {
            if (!isEmpty(user.profile_picture) && !user.profile_picture.includes("blob.core.windows.net/")) {
                user.profile_picture = config.BASE_URL + user.profile_picture;
                user.profile_picture_thumb = config.BASE_URL + user.profile_picture_thumb;
            }
        });

        let currentUser = await dbClass.executeQuery(`
            SELECT user_id, username, CONCAT(first_name, " ", last_name) AS name, 
            profile_picture, profile_picture_thumb, ROUND(total_tickets, 0) AS total_tickets, 
            total_no_of_giveaway_won, total_no_of_top_weekly_ticket_reward_won, device_region 
            FROM ${constTableNames.USERS} 
            WHERE user_id = ${currentUserId};
        `);

        if (currentUser.data.length > 0) {
            currentUser.data[0].currentUserRank = currentUserRank + 1;
        }

        let responseObj = {
            records: paginatedRecords,
            currentUser: currentUser.data[0],
            currentPage: currentPage,
            hasNextPage: (itemsPerPage * currentPage) < allUsers.data.length,
            hasPreviousPage: currentPage > 1,
            nextPage: currentPage + 1,
            previousPage: currentPage - 1,
            lastPage: Math.ceil(allUsers.data.length / itemsPerPage)
        };

        return commonClass.reply(res, false, constMessages.SUCCESS.DATA_FETCH_SUCCESS, 200, responseObj);
    },