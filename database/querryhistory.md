
get reports with cluster id
```SQL
SELECT *, ST_ClusterDBSCAN(point::geometry, eps := 0.15::float, minPoints := 1) OVER() 
AS cluster_id  FROM report;
``` 

count number of points in each cluster
```SQL
SELECT cluster_id, Count(cluster_id) FROM (
	  SELECT point, ST_ClusterDBSCAN(point::geometry, eps := 0.15::float, minPoints := 1)
  OVER() AS cluster_id  FROM report) sq GROUP BY cluster_id;
``` 

get points in a cluster
```SQL
SELECT * FROM (
	  SELECT point, ST_ClusterDBSCAN(point::geometry, eps := 0.15::float, minPoints := 1)
  OVER() AS cluster_id  FROM report) sq
  where cluster_id = 11;
``` 
