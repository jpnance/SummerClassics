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
			}
			console.log(data);
		});

		e.preventDefault();
	});
});
