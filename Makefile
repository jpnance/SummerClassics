ci:
	docker run --rm -v $(PWD):/app node:14-alpine sh -c "cd /app && npm ci"

seed:
	@echo "Use something like:"
	@echo "docker exec -i classix-mongo sh -c \"mongorestore --drop --archive\" < ~/backups/classix/classix.dump"

schedule:
	docker exec classix-cron sh -c "cd /app/bin && node schedule.js"

games:
	docker exec classix-cron sh -c "cd /app/bin && node games.js"

projections:
	docker exec classix-cron sh -c "cd /app/bin && node projections.js"
