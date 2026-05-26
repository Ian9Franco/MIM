select * from
(select count(pid) as active_connections FROM pg_stat_activity where state = 'active') active_connections,
(select setting as max_connections from pg_settings where name = 'max_connections') max_connections;