ci:
	docker run --rm -v $(PWD):/app node:22-alpine sh -c "cd /app && npm ci"

seed:
	@echo "Use something like:"
	@echo "docker exec -i classix-mongo sh -c \"mongorestore --drop --archive\" < ~/backups/classix.dump"

teams:
	docker exec classix-cron sh -c "cd /app/bin && node teams.js"

schedule:
	docker exec classix-cron sh -c "cd /app/bin && node schedule.js"

games:
	docker exec classix-cron sh -c "cd /app/bin && node games.js"

report:
	docker exec classix-cron sh -c "cd /app/bin && node report.js"

finalize:
	docker exec -e FINALIZE=true classix-cron sh -c "cd /app/bin && node games.js"

projections:
	docker exec classix-cron sh -c "cd /app/bin && node projections.js"
