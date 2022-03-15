config-validate:
	@docker-compose config

containers-init:
	@docker-compose up -d --build --force-recreate
	@docker-compose logs -f

node-start:
	@docker-compose start trinci

node-stop:
	@docker-compose stop trinci

node-reset:
	@docker-compose exec trinci bash -c "rm -rf /home/node/trinci/db /home/node/trinci/trinci.log"
	@docker-compose stop trinci
	@docker-compose start trinci

node-logs:
	@docker-compose exec trinci bash -c "tail -f -n 1000 /home/node/trinci/trinci.log"

node-shell:
	@docker-compose exec trinci bash

purge-all:
	@docker-compose down
	@rm -rf ../node_modules ../package-lock.json
	@rm -rf ../../node_modules ../../package-lock.json
	@rm -rf ../../build

smartcontract-clean:
	@rm -rf ../build

smartcontract-build:
	@docker-compose up smartcontract
	@docker-compose logs -f smartcontract