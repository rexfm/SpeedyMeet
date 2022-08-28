// Restores select box state to saved value from localStorage.
function restore_options() {
  var setValues = function (values) {
    $('#stopVideoOnJoin').prop('checked', values.stopVideoOnJoin);
    $('#stopMicOnJoin').prop('checked', values.stopMicOnJoin);
    $('#spaceBarToUnmute').prop('checked', values.spaceBarToUnmute);
    $('#skipPreMeeting').prop('checked', values.skipPreMeeting);
    $('#skipPostMeeting').prop('checked', values.skipPostMeeting);
  };
  chrome.storage.sync.get(
    [
      'stopVideoOnJoin',
      'stopMicOnJoin',
      'spaceBarToUnmute',
      'skipPreMeeting',
      'skipPostMeeting',
    ],
    function (values) {
      setValues(values);
    }
  );
}

document.addEventListener('DOMContentLoaded', function () {
  console.log('loaded?');
  restore_options();

  $('.form-check-input').on('click', function () {
    console.log('called?');
    const enabled = $(this).is(':checked');
    const key = $(this).attr('id');
    chrome.storage.sync.set(
      {
        [key]: enabled,
      },
      function () {
        console.log('Settings saved');
      }
    );
  });
});
