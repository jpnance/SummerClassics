$(document).ready(function() {
	$('body').on('click', 'a.team-button', function(e) {
		var $this = $(e.currentTarget);
		var actionLink = $this.attr('href');

		$.get(actionLink, function(data) {
			if (data.success) {
				$('#game-' + data.gameId).find('div.team').each(function(i, team) {
					var $this = $(team);

					$this.removeClass('picked').addClass('unpicked');

					if ($this.attr('id') == 'team-' + data.teamId) {
						$this.removeClass('unpicked').addClass('picked');
					}
				});

				$('#game-' + data.gameId).find('li.team-row').each(function(i, teamRow) {
					var $this = $(teamRow);

					$this.removeClass('bg-light-gray');

					if ($this.attr('id') == 'team-row-' + data.teamId) {
						$this.addClass('bg-light-gray');
					}
				});
			}
		});

		e.preventDefault();
	});
});
