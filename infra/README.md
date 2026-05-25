Infrastructure layout
=====================

Purpose
-------
This folder contains non-application assets used by Docker services:
- database initialization scripts
- Ontop mappings and ontology files
- JDBC drivers
- Trino catalog configuration

Structure
---------
- db/mysql: MySQL init scripts mounted to mysql container
- db/postgres: PostgreSQL init scripts mounted to postgres container
- ontop/obda: Ontop mapping files, properties, and sample SPARQL query
- ontop/jdbc: JDBC drivers mounted to Ontop containers
- ontop/idmp: ontology repository used by Ontop XML catalog
- trino/etc/catalog: Trino connector catalog files
