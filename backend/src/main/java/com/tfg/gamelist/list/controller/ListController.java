package com.tfg.gamelist.list.controller;

import com.tfg.gamelist.list.dto.*;
import com.tfg.gamelist.list.service.ListService;
import com.tfg.gamelist.user.entity.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
public class ListController {

    private final ListService listService;

    public ListController(ListService listService) {
        this.listService = listService;
    }

    @GetMapping("/api/users/{username}/lists")
    public ResponseEntity<List<ListResponse>> getLists(
            @PathVariable @NotBlank @Size(max = 40) String username,
            @AuthenticationPrincipal User viewer) {
        Long viewerId = viewer != null ? viewer.getId() : null;
        return ResponseEntity.ok(listService.listsByUsername(username, viewerId));
    }

    @PostMapping("/api/me/lists")
    public ResponseEntity<ListResponse> createList(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid CreateListRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(listService.createList(user, req));
    }

    @PutMapping("/api/me/lists/{listId}")
    public ResponseEntity<ListResponse> updateList(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) Long listId,
            @RequestBody @Valid UpdateListRequest req) {
        return ResponseEntity.ok(listService.updateList(user, listId, req));
    }

    @DeleteMapping("/api/me/lists/{listId}")
    public ResponseEntity<Void> deleteList(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) Long listId) {
        listService.deleteList(user, listId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/me/lists/{listId}/items")
    public ResponseEntity<ListResponse> addItem(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) Long listId,
            @RequestBody @Valid AddListItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(listService.addItem(user, listId, req));
    }

    @DeleteMapping("/api/me/lists/{listId}/items/{rawgGameId}")
    public ResponseEntity<Void> removeItem(
            @AuthenticationPrincipal User user,
            @PathVariable @Min(1) Long listId,
            @PathVariable @Min(1) Long rawgGameId) {
        listService.removeItem(user, listId, rawgGameId);
        return ResponseEntity.noContent().build();
    }
}
